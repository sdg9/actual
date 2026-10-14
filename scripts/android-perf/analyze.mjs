import fs from 'fs';

const dir = process.argv[2];
const topN = +process.argv[3] || 18;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.cpuprofile'))) {
  const p = JSON.parse(fs.readFileSync(`${dir}/${f}`));
  const nodes = new Map(p.nodes.map(n => [n.id, n]));
  const parent = new Map();
  p.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
  const self = new Map(),
    incl = new Map();
  const dt = p.timeDeltas;
  let total = 0;
  p.samples.forEach((id, i) => {
    const d = (dt[i + 1] ?? 0) / 1000;
    total += d;
    const n = nodes.get(id);
    const cf = n.callFrame;
    const key = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().slice(0, 28)}:${cf.lineNumber}`;
    self.set(key, (self.get(key) || 0) + d);
    const seen = new Set();
    let cur = id;
    while (cur) {
      const c2 = nodes.get(cur).callFrame;
      const k = `${c2.functionName || '(anon)'} ${c2.url.split('/').pop().slice(0, 28)}:${c2.lineNumber}`;
      if (!seen.has(k)) {
        incl.set(k, (incl.get(k) || 0) + d);
        seen.add(k);
      }
      cur = parent.get(cur);
    }
  });
  console.log(
    `\n=== ${f} total ${Math.round(total)} ms span ${Math.round((p.endTime - p.startTime) / 1000)} ms`,
  );
  console.log('-- self');
  [...self]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .forEach(([k, v]) => console.log(Math.round(v).toString().padStart(7), k));
  console.log('-- inclusive');
  [...incl]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN + 10)
    .forEach(([k, v]) => console.log(Math.round(v).toString().padStart(7), k));
}
