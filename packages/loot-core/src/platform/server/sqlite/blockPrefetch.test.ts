import { BlockPrefetch, installPrefetch } from './blockPrefetch';
import type { PrefetchableFile } from './blockPrefetch';

const SIZE = 4096;

function block(fill: number, counter = 1) {
  const data = new ArrayBuffer(SIZE);
  new Uint8Array(data).fill(fill);
  const view = new DataView(data);
  view.setUint16(16, SIZE);
  view.setUint32(24, counter);
  return data;
}

function fakeFile(disk: Map<number, ArrayBuffer>) {
  const reads: number[] = [];
  const file: PrefetchableFile = {
    meta: { size: disk.size * SIZE, blockSize: SIZE },
    setattr(attr) {
      Object.assign(this.meta, attr);
    },
    ops: {
      getStoreName: () => 'test',
      readBlocks(positions, blockSize) {
        return positions.map(pos => {
          reads.push(pos / blockSize);
          return { pos, data: disk.get(pos / blockSize).slice(0) };
        });
      },
      writeBlocks(writes, blockSize) {
        for (const w of writes) {
          disk.set(w.pos / blockSize, w.data);
        }
        return 0;
      },
      delete() {
        disk.clear();
      },
    },
  };
  return { file, reads };
}

function setup() {
  const disk = new Map([
    [0, block(0)],
    [1, block(1)],
    [2, block(2)],
    [3, block(3)],
  ]);
  const snapshot = new Map([...disk].map(([k, v]) => [k, v.slice(0)]));
  const { file, reads } = fakeFile(disk);
  const prefetch = new BlockPrefetch(snapshot, SIZE, 0);
  installPrefetch(file, prefetch);
  const read = (key: number) =>
    new Uint8Array(file.ops.readBlocks([key * SIZE], SIZE)[0].data)[100];
  return { disk, file, reads, prefetch, read };
}

describe('database block prefetch', () => {
  test('serves prefetched blocks once without reading IndexedDB', () => {
    const { reads, prefetch, read } = setup();
    expect(read(0)).toBe(0);
    expect(read(2)).toBe(2);
    expect(reads).toEqual([0]);
    expect(prefetch.size).toBe(2);

    // Served blocks are dropped; SQLite caches them from here.
    expect(read(2)).toBe(2);
    expect(reads).toEqual([0, 2]);
  });

  test('always reads the header block from IndexedDB', () => {
    const { reads, read } = setup();
    read(0);
    read(0);
    expect(reads).toEqual([0, 0]);
  });

  test('discards everything when another connection changed the file', () => {
    const { disk, reads, prefetch, read } = setup();
    disk.set(0, block(0, 2));
    disk.set(1, block(9, 2));
    read(0);
    expect(prefetch.size).toBe(0);
    expect(read(1)).toBe(9);
    expect(reads).toEqual([0, 1]);
  });

  test('validates the header before serving a batch that includes it', () => {
    const { disk, file, prefetch } = setup();
    disk.set(0, block(0, 2));
    disk.set(3, block(7, 2));
    const chunks = file.ops.readBlocks([0, 3 * SIZE], SIZE);
    expect(prefetch.size).toBe(0);
    expect(chunks.map(c => c.pos)).toEqual([0, 3 * SIZE]);
    expect(new Uint8Array(chunks[1].data)[100]).toBe(7);
  });

  test('never serves blocks written by this connection', () => {
    const { file, reads, prefetch, read } = setup();
    file.ops.writeBlocks(
      [
        { pos: 0, data: block(0, 2) },
        { pos: 1 * SIZE, data: block(5, 2) },
      ],
      SIZE,
    );
    // Our own commit updated the expected header, so the rest stays valid.
    expect(read(0)).toBe(0);
    expect(prefetch.size).toBe(2);
    expect(read(1)).toBe(5);
    expect(read(2)).toBe(2);
    expect(reads).toEqual([0, 1]);
  });

  test('discards everything on truncation, deletion or page size change', () => {
    let s = setup();
    s.file.setattr({ size: SIZE });
    expect(s.prefetch.size).toBe(0);

    s = setup();
    s.file.ops.delete();
    expect(s.prefetch.size).toBe(0);

    s = setup();
    const resized = block(0, 2);
    new DataView(resized).setUint16(16, 8192);
    s.file.ops.writeBlocks([{ pos: 0, data: resized }], SIZE);
    expect(s.prefetch.size).toBe(0);
  });

  test('releases unused blocks after the time limit', () => {
    vi.useFakeTimers();
    try {
      const prefetch = new BlockPrefetch(
        new Map([
          [0, block(0)],
          [1, block(1)],
        ]),
        SIZE,
        1000,
      );
      expect(prefetch.size).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(prefetch.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
