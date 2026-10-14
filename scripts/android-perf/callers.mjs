import fs from 'fs';

const p = JSON.parse(fs.readFileSync(process.argv[2]));
const clickUs = process.argv[3] ? +process.argv[3] : null; // ms offset from profile start to split before/after
const nodes = new Map(p.nodes.map(n => [n.id, n]));
const parent = new Map();
p.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
const name = id => {
  const cf = nodes.get(id).callFrame;
  return `${cf.functionName || '(anon)'}:${cf.lineNumber}:${cf.columnNumber}`;
};
const agg = [new Map(), new Map()];
let t = 0;
p.samples.forEach((id, i) => {
  t += (p.timeDeltas[i] || 0) / 1000;
  const d = (p.timeDeltas[i + 1] || 0) / 1000;
  const stack = [];
  let cur = id;
  while (cur) {
    stack.push(name(cur));
    cur = parent.get(cur);
  }
  const k = stack.findIndex(s => s.startsWith('runQuery$1'));
  if (k < 0) return;
  const key = stack
    .slice(k + 1, k + 6)
    .map(s => s.split(':')[0])
    .join(' < ');
  const bucket = clickUs != null && t >= clickUs ? 1 : 0;
  agg[bucket].set(key, (agg[bucket].get(key) || 0) + d);
});
['before split', 'after split'].forEach((l, i) => {
  console.log('--', l);
  [...agg[i]]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .forEach(
      ([k, v]) =>
        v > 40 && console.log(Math.round(v).toString().padStart(6), k),
    );
});
