import { connect, touch } from './common.mjs';
import { INSTALL, READY_TXNS, RESULT } from './instrument.mjs';

const CATEGORY = process.env.ACTUAL_PERF_CATEGORY || 'Tithing';
const { page } = await connect();
const reload = process.argv[2] === 'reload';
if (reload) {
  const t0 = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.getByTestId('budget-table').waitFor({ timeout: 180000 });
  console.log('reload->budget-table ms (node clock)', Date.now() - t0);
  console.log(
    'navStart->now (page clock)',
    await page.evaluate(() => Math.round(performance.now())),
  );
}
await page.evaluate(INSTALL);
const btn = page
  .getByRole('button', {
    name: new RegExp(`Show transactions for .*${CATEGORY} category`),
  })
  .first();
await btn.waitFor({ timeout: 120000 });
await page.evaluate(READY_TXNS);
await touch(page, btn);
await page.waitForFunction(() => window.__ap.ready > 0, null, {
  timeout: 120000,
  polling: 200,
});
console.log(JSON.stringify(await page.evaluate(RESULT)));
await touch(page, page.getByRole('button', { name: /Back/ }).first());
await page.getByTestId('budget-table').waitFor();
process.exit(0);
