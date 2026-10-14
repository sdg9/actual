import { connect } from './common.mjs';

const APP = process.env.ACTUAL_URL || 'http://localhost:5007';
const { page } = await connect();
await page.goto(APP + '/budget', { waitUntil: 'domcontentloaded' });
await page.evaluate(async () => {
  for (const r of await navigator.serviceWorker.getRegistrations()) {
    await r.unregister();
  }
  for (const k of await caches.keys()) await caches.delete(k);
});
const t0 = Date.now();
await page.reload({ waitUntil: 'domcontentloaded' });
await page.getByTestId('budget-table').waitFor({ timeout: 400000 });
console.log(
  'ok',
  Date.now() - t0,
  await page.evaluate(() =>
    [...document.scripts].map(s => s.src).filter(Boolean),
  ),
);
process.exit(0);
