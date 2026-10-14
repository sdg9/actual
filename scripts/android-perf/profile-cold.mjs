import fs from 'fs';

import { cdp } from './cdp.mjs';
import { INSTALL, READY_TXNS, RESULT } from './instrument.mjs';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name}`);
  }
  return value;
}

const APP = process.env.ACTUAL_URL || 'http://localhost:5007';
const CATEGORY = requireEnv('ACTUAL_PERF_CATEGORY');
// CDP commands to workers that already exited are safe to ignore.
const ignore = () => undefined;

// Reload page, profile main + all workers through: budget ready, first category tap -> ready.
const out =
  process.argv[2] || (process.env.OUT_DIR || '/tmp/android-perf') + '/prof';
fs.mkdirSync(out, { recursive: true });
const c = await cdp();
const { targetInfos } = await c.send('Target.getTargets');
const pageT = targetInfos.find(t => t.type === 'page' && t.url.startsWith(APP));
const { sessionId: ps } = await c.send('Target.attachToTarget', {
  targetId: pageT.targetId,
  flatten: true,
});
const sessions = new Map([[ps, 'main']]);
c.on(async d => {
  if (d.method === 'Target.attachedToTarget') {
    const s = d.params.sessionId;
    const ti = d.params.targetInfo;
    sessions.set(s, ti.type + ':' + ti.url.split('/').pop().slice(0, 30));
    await c
      .send(
        'Target.setAutoAttach',
        { autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
        s,
      )
      .catch(ignore);
    await c.send('Profiler.enable', {}, s).catch(ignore);
    await c
      .send('Profiler.setSamplingInterval', { interval: 1000 }, s)
      .catch(ignore);
    if (!process.env.NOPROF) {
      await c.send('Profiler.start', {}, s).catch(ignore);
    }
    await c.send('Runtime.runIfWaitingForDebugger', {}, s).catch(ignore);
  }
});
await c.send(
  'Target.setAutoAttach',
  { autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
  ps,
);
await c.send('Runtime.enable', {}, ps);
await c.send('Profiler.enable', {}, ps);
await c.send('Profiler.setSamplingInterval', { interval: 1000 }, ps);
await c.send('Page.enable', {}, ps);
const ev = async expression =>
  (
    await c.send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
      ps,
    )
  ).result.value;
const t0 = Date.now();
await c.send('Page.reload', { ignoreCache: false }, ps);
await new Promise(r => setTimeout(r, 300));
if (!process.env.NOPROF) await c.send('Profiler.start', {}, ps);
for (
  let i = 0;
  i < 900 &&
  !(await ev(`!!document.querySelector('[data-testid="budget-table"]')`).catch(
    () => false,
  ));
  i++
) {
  await new Promise(r => setTimeout(r, 200));
}
const loadMs = Date.now() - t0;
const pageLoad = await ev('Math.round(performance.now())');
await ev(`(${INSTALL})()`);
await ev(`(${READY_TXNS})()`);
const box = await ev(
  `(() => { const b=[...document.querySelectorAll('button')].find(b => new RegExp(${JSON.stringify(`Show transactions for .*${CATEGORY} category`)}).test(b.getAttribute('aria-label')||'')); b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`,
);
await new Promise(r => setTimeout(r, 300));
await c.send(
  'Input.dispatchTouchEvent',
  { type: 'touchStart', touchPoints: [box] },
  ps,
);
await c.send(
  'Input.dispatchTouchEvent',
  { type: 'touchEnd', touchPoints: [] },
  ps,
);
while (!(await ev('window.__ap.ready > 0'))) {
  await new Promise(r => setTimeout(r, 200));
}
const res = await ev(`(${RESULT})()`);
const clickAt = await ev('Math.round(window.__ap.click)');
await ev('history.back()');
if (!process.env.NOPROF) {
  for (const [s, name] of sessions) {
    try {
      const { profile } = await c.send('Profiler.stop', {}, s);
      fs.writeFileSync(
        `${out}/${name.replace(/[^a-z0-9.-]/gi, '_')}.cpuprofile`,
        JSON.stringify(profile),
      );
    } catch (e) {
      console.log('stop fail', name, e.message.slice(0, 80));
    }
  }
}
console.log(
  JSON.stringify({
    loadMs,
    pageLoad,
    clickAt,
    ...res,
    sessions: [...sessions.values()],
  }),
);
process.exit(0);
