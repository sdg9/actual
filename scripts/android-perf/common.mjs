import { createRequire } from 'module';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name}`);
  }
  return value;
}

const require = createRequire(
  new URL('../../packages/desktop-client/package.json', import.meta.url),
);
export const APP = process.env.ACTUAL_URL || 'http://localhost:5007';
export const CATEGORY = requireEnv('ACTUAL_PERF_CATEGORY');
// Resolved from the web package, which depends on @playwright/test.
// oxlint-disable-next-line actual/no-extraneous-dependencies
export const { chromium } = require('@playwright/test');
export async function connect() {
  const browser = await chromium.connectOverCDP(
    process.env.CDP_URL || 'http://localhost:9333',
  );
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().startsWith(APP)) || ctx.pages()[0];
  return { browser, ctx, page };
}
export async function touch(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  const s = await page.context().newCDPSession(page);
  const p = [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }];
  await s.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: p,
  });
  await s.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await s.detach();
}
