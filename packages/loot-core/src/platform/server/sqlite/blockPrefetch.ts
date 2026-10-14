// absurd-sql reads every SQLite page that misses the page cache through a
// synchronous, per-block handshake with an IndexedDB helper worker. On Android
// Chrome each handshake costs milliseconds, so the first launch or first query
// over a large budget can spend many seconds fetching blocks one at a time.
// Reading the whole file with one asynchronous `getAll` before SQLite opens it
// is far cheaper. Prefetched blocks are handed to SQLite once and then dropped;
// SQLite's own page cache keeps them afterwards.
//
// Correctness rules:
// - Block 0 (the database header) is always read from IndexedDB. If its file
//   change counter differs from the prefetched snapshot, another connection has
//   written the file, so every prefetched block is discarded.
// - Blocks written by this connection are evicted before they reach IndexedDB.
// - Page-size changes, truncation and deletion discard the whole prefetch.

type Chunk = { pos: number; data: ArrayBuffer };
type Write = { pos: number; data: ArrayBuffer };

export type PrefetchableOps = {
  readBlocks(positions: number[], blockSize: number): Chunk[];
  writeBlocks(writes: Write[], blockSize: number): unknown;
  delete(): void;
  getStoreName(): string;
};

export type PrefetchableFile = {
  ops: PrefetchableOps;
  meta: { size: number; blockSize?: number } | null;
  setattr(attr: { size?: number; blockSize?: number }): void;
};

// The change counter, version-valid-for and other header bytes absurd-sql
// itself compares to detect writes from another connection.
const HEADER_START = 24;
const HEADER_END = 40;

// Don't hold more than this in memory waiting for SQLite to ask for it.
export const MAX_PREFETCH_BYTES = 96 * 1024 * 1024;
// Release blocks SQLite never asked for.
export const PREFETCH_TTL_MS = 5 * 60 * 1000;

function headerOf(block: ArrayBuffer | undefined | null) {
  if (!block || block.byteLength < HEADER_END) {
    return null;
  }
  return Array.from(
    new Uint8Array(block, HEADER_START, HEADER_END - HEADER_START),
  );
}

function sameHeader(a: number[] | null, b: number[] | null) {
  return a != null && b != null && a.every((v, i) => v === b[i]);
}

export class BlockPrefetch {
  blocks: Map<number, ArrayBuffer>;
  blockSize: number;
  header: number[] | null;
  served = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    blocks: Map<number, ArrayBuffer>,
    blockSize: number,
    ttlMs = PREFETCH_TTL_MS,
  ) {
    this.blocks = blocks;
    this.blockSize = blockSize;
    this.header = headerOf(blocks.get(0));
    // Block 0 must always come from IndexedDB; keep only its header.
    this.blocks.delete(0);
    if (ttlMs > 0) {
      this.timer = setTimeout(() => this.clear(), ttlMs);
    }
  }

  get size() {
    return this.blocks.size;
  }

  clear() {
    this.blocks.clear();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  // Validates a block 0 freshly read from IndexedDB.
  checkHeader(block: ArrayBuffer) {
    if (!sameHeader(this.header, headerOf(block))) {
      this.clear();
    }
  }

  take(key: number, blockSize: number) {
    if (blockSize !== this.blockSize || key === 0) {
      return undefined;
    }
    const data = this.blocks.get(key);
    if (data) {
      this.blocks.delete(key);
      this.served++;
      if (this.blocks.size === 0) {
        this.clear();
      }
    }
    return data;
  }

  noteWrites(writes: Write[], blockSize: number) {
    if (blockSize !== this.blockSize) {
      this.clear();
      return;
    }
    for (const write of writes) {
      const key = write.pos / blockSize;
      if (key === 0) {
        const header = headerOf(write.data);
        const pageSize = header
          ? new DataView(write.data).getUint16(16) || 65536
          : null;
        if (pageSize !== null && pageSize !== this.blockSize) {
          this.clear();
          return;
        }
        // Our own commit: later fresh header reads should match this.
        this.header = header;
      } else {
        this.blocks.delete(key);
      }
    }
  }
}

const installed = new WeakMap<PrefetchableFile, BlockPrefetch>();

export function getInstalledPrefetch(file: PrefetchableFile) {
  return installed.get(file);
}

// Wraps a file's block operations so reads are served from `prefetch` first.
export function installPrefetch(
  file: PrefetchableFile,
  prefetch: BlockPrefetch,
) {
  const existing = installed.get(file);
  if (existing) {
    existing.clear();
    installed.set(file, prefetch);
    return;
  }
  installed.set(file, prefetch);
  const ops = file.ops;
  const readBlocks = ops.readBlocks.bind(ops);
  const writeBlocks = ops.writeBlocks.bind(ops);
  const deleteFile = ops.delete.bind(ops);
  const setattr = file.setattr.bind(file);
  const current = () => installed.get(file);

  ops.readBlocks = (positions, blockSize) => {
    const p = current();
    if (!p || p.size === 0) {
      return readBlocks(positions, blockSize);
    }
    const results: Chunk[] = [];
    // Validate the header before serving anything else from memory.
    if (positions.some(pos => pos / blockSize === 0)) {
      const [first] = readBlocks([0], blockSize);
      p.checkHeader(first.data);
      results.push(first);
    }
    const missing: number[] = [];
    for (const pos of positions) {
      const key = pos / blockSize;
      if (key === 0) {
        continue;
      }
      const data = p.take(key, blockSize);
      if (data) {
        results.push({ pos, data });
      } else {
        missing.push(pos);
      }
    }
    if (missing.length > 0) {
      results.push(...readBlocks(missing, blockSize));
    }
    // Callers match chunks by position, but keep the requested order anyway.
    const order = new Map(positions.map((pos, i) => [pos, i]));
    return results.sort((a, b) => order.get(a.pos) - order.get(b.pos));
  };

  ops.writeBlocks = (writes, blockSize) => {
    current()?.noteWrites(writes, blockSize);
    return writeBlocks(writes, blockSize);
  };

  ops.delete = () => {
    current()?.clear();
    return deleteFile();
  };

  file.setattr = attr => {
    const p = current();
    if (
      p &&
      ((attr.size != null && file.meta && attr.size < file.meta.size) ||
        (attr.blockSize != null && attr.blockSize !== p.blockSize))
    ) {
      p.clear();
    }
    return setattr(attr);
  };
}

function request<T>(req: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Reads every block of an absurd-sql file in one IndexedDB transaction.
export async function readAllBlocks(storeName: string) {
  const idb = globalThis.indexedDB;
  if (!idb) {
    return null;
  }
  // Same version and upgrade as absurd-sql's worker so we never conflict.
  const openReq = idb.open(storeName, 2);
  openReq.onupgradeneeded = () => {
    const db = openReq.result;
    if (!db.objectStoreNames.contains('data')) {
      db.createObjectStore('data');
    }
  };
  const db = await request(openReq);
  const tx = db.transaction(['data'], 'readonly');
  const finished = new Promise<void>(resolve => {
    tx.oncomplete = tx.onabort = tx.onerror = () => resolve();
  });
  try {
    const store = tx.objectStore('data');
    const meta = await request(store.get(-1));
    if (!meta || meta.size > MAX_PREFETCH_BYTES) {
      return null;
    }
    const range = IDBKeyRange.lowerBound(0);
    const [keys, values] = await Promise.all([
      request(store.getAllKeys(range)),
      request(store.getAll(range)),
    ]);
    const blocks = new Map<number, ArrayBuffer>();
    keys.forEach((key, i) => blocks.set(key as number, values[i]));
    return blocks;
  } finally {
    // SQLite opens the file synchronously next and blocks this thread while
    // absurd-sql's worker takes its locks. A transaction that is only
    // auto-committed after this task would then hold the store forever and
    // deadlock absurd-sql's first write lock. Commit and wait for it.
    tx.commit?.();
    await finished;
    db.close();
  }
}

export async function prefetchFile(file: PrefetchableFile) {
  const blocks = await readAllBlocks(file.ops.getStoreName());
  const first = blocks?.get(0);
  if (!blocks || !first || first.byteLength < HEADER_END) {
    return null;
  }
  const blockSize = new DataView(first).getUint16(16) || 65536;
  if (blockSize !== first.byteLength) {
    return null;
  }
  const prefetch = new BlockPrefetch(blocks, blockSize);
  installPrefetch(file, prefetch);
  return prefetch;
}
