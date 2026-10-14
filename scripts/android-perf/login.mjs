import fs from 'fs';

import { connect } from './common.mjs';

const { page } = await connect();
const pw = fs
  .readFileSync(
    process.env.ACTUAL_PASSWORD_FILE ||
      process.env.HOME + '/.config/actual-budget/server-password',
    'utf8',
  )
  .trim();
await page.locator('input[type=password]').fill(pw);
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForTimeout(4000);
console.log(page.url());
console.log((await page.locator('body').innerText()).slice(0, 500));
process.exit(0);
