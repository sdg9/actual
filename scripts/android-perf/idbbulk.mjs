import { connect } from './common.mjs';

const { page } = await connect();
const r = await page.evaluate(async () => {
  const dbs = await indexedDB.databases();
  const out = { dbs: dbs.map(d => d.name) };
  const name = dbs
    .map(d => d.name)
    .find(n => n.includes('db.sqlite') || n.startsWith('-blocked'));
  out.name = name;
  const db = await new Promise((res, rej) => {
    const q = indexedDB.open(name);
    q.onsuccess = () => res(q.result);
    q.onerror = rej;
  });
  for (const mode of ['getAll', 'getAll']) {
    const t = performance.now();
    const vals = await new Promise((res, rej) => {
      const q = db
        .transaction(['data'], 'readonly')
        .objectStore('data')
        .getAll();
      q.onsuccess = () => res(q.result);
      q.onerror = rej;
    });
    out[mode + '_' + Math.round(t)] = {
      ms: Math.round(performance.now() - t),
      n: vals.length,
      bytes: vals.reduce((a, v) => a + (v.byteLength || 0), 0),
    };
  }
  // 300 individual gets, async (best case, no cross-thread handshakes)
  const t = performance.now();
  const tx = db.transaction(['data'], 'readonly').objectStore('data');
  for (let i = 1; i <= 300; i++) {
    await new Promise(res => {
      const q = tx.get(i);
      q.onsuccess = res;
    });
  }
  out.individual300ms = Math.round(performance.now() - t);
  db.close();
  return out;
});
console.log(JSON.stringify(r));
process.exit(0);
