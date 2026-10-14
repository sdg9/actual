import fs from 'node:fs';

import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

import { ConfigurationPage } from './page-models/configuration-page';

type PerfState = {
  click: number;
  longTasks: number[];
  queries: { key: string; ms: number }[];
};

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- Window augmentation must merge with the DOM interface.
  interface Window {
    __householdPerf: PerfState;
  }
}

// Explicit opt-in: the private fixture and result stay outside the repository.
// This imports a COPY into an isolated, serverless browser context.
test('household mobile performance', async ({ browser }) => {
  const fixture = process.env.ACTUAL_PERF_FIXTURE;
  test.skip(!fixture, 'Set ACTUAL_PERF_FIXTURE to a private Actual export.');
  test.setTimeout(600_000);
  if (!fixture) return;
  const cpuRates = (process.env.ACTUAL_PERF_CPU_RATES || '1,4')
    .split(',')
    .map(Number);
  if (cpuRates.some(rate => !Number.isFinite(rate) || rate < 1)) {
    throw new Error('ACTUAL_PERF_CPU_RATES must contain rates >= 1.');
  }
  const context = await browser.newContext({
    viewport: { width: 393, height: 851 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'playwright',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const client = await context.newCDPSession(page);
  await page.addInitScript(() => {
    const state = {
      click: 0,
      longTasks: [] as number[],
      queries: [] as { key: string; ms: number }[],
    };
    Object.assign(window, { __householdPerf: state });
    document.addEventListener(
      'click',
      () => {
        state.click = performance.now();
      },
      true,
    );
    new PerformanceObserver(list =>
      state.longTasks.push(...list.getEntries().map(e => e.duration)),
    ).observe({ type: 'longtask' });
  });
  await page.goto('/');
  console.log('benchmark: importing isolated household copy');
  await new ConfigurationPage(page).importBudget('Actual', fixture);
  await page.getByTestId('budget-table').waitFor({ timeout: 120_000 });
  console.log('benchmark: import ready');
  // Let the import finish before measuring normal interactions.
  await page.evaluate(async () => {
    const cache = window.__TANSTACK_QUERY_CLIENT__.getQueryCache();
    const starts = new Map<string, number>();
    cache.subscribe(event => {
      if (event.type !== 'updated') return;
      const q = event.query;
      if (q.state.fetchStatus === 'fetching' && !starts.has(q.queryHash)) {
        starts.set(q.queryHash, performance.now());
      }
      if (q.state.fetchStatus === 'idle' && starts.has(q.queryHash)) {
        // Query family only: never write IDs, names, amounts, or SQL parameters.
        window.__householdPerf.queries.push({
          key: String(q.queryKey[0]),
          ms: performance.now() - starts.get(q.queryHash)!,
        });
        starts.delete(q.queryHash);
      }
    });
  });
  const results: {
    name: string;
    rate: number;
    ms: number;
    longTasks: number[];
    nodes: number;
  }[] = [];
  async function measure(name: string, target: Locator, ready: Locator) {
    await target.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const p = window.__householdPerf;
      p.click = 0;
      p.longTasks = [];
      p.queries = [];
    });
    const oldMonth = name.endsWith('-month')
      ? await page.locator('button[data-month]').getAttribute('data-month')
      : null;
    const profile =
      process.env.ACTUAL_PERF_PROFILE &&
      name === 'previous-month' &&
      rate === 4;
    if (profile) {
      await client.send('Profiler.enable');
      await client.send('Profiler.start');
    }
    await target.click();
    if (oldMonth) {
      await page.waitForFunction(
        old =>
          document
            .querySelector('button[data-month]')
            ?.getAttribute('data-month') !== old,
        oldMonth,
      );
    }
    await ready.waitFor();
    if (name.includes('transactions')) {
      await page
        .getByLabel('Loading transactions...', { exact: true })
        .waitFor({ state: 'hidden' });
      await page
        .getByLabel('Transaction list', { exact: true })
        .getByRole('option')
        .first()
        .waitFor();
    }
    await page.evaluate(
      () =>
        new Promise(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const timing = await page.evaluate(() => {
      const p = window.__householdPerf;
      return {
        ms: performance.now() - p.click,
        longTasks: p.longTasks,
        queries: p.queries,
        nodes: document.querySelectorAll('*').length,
      };
    });
    if (profile) {
      const data = await client.send('Profiler.stop');
      fs.writeFileSync(
        process.env.ACTUAL_PERF_PROFILE!,
        JSON.stringify(data.profile),
      );
    }
    results.push({ name, rate, ...timing });
    console.log(`benchmark: ${name} CPU${rate} ${Math.round(timing.ms)}ms`);
    fs.writeFileSync(
      process.env.ACTUAL_PERF_OUTPUT || '/tmp/actual-performance.json',
      JSON.stringify({ results }, null, 2),
    );
  }
  const nav = page.locator('[data-navbar-state]');
  let rate = 1;
  for (const cpuRate of cpuRates) {
    rate = cpuRate;
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    for (let repeat = 0; repeat < 5; repeat++) {
      await measure(
        'category-menu',
        page.getByTestId('category-name').first(),
        page.getByTestId('category-menu-modal'),
      );
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await measure(
        'budget-menu',
        page.getByRole('button', { name: /^Open budget menu for/ }).first(),
        page.getByTestId('envelope-budget-menu-modal'),
      );
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      const spentButtons = page.getByRole('button', {
        name: /^Show transactions for/,
      });
      const activeIndex = await spentButtons.evaluateAll(buttons =>
        buttons.findIndex(b => /[1-9]/.test(b.textContent || '')),
      );
      await measure(
        'category-transactions',
        spentButtons.nth(Math.max(activeIndex, 0)),
        page.getByLabel('Transaction list', { exact: true }),
      );
      await page
        .getByLabel('Loading transactions...', { exact: true })
        .waitFor({ state: 'hidden' });
      const transaction = page
        .getByLabel('Transaction list', { exact: true })
        .getByRole('option')
        .first();
      if (await transaction.count()) {
        await measure(
          'transaction-editor',
          transaction,
          page.getByTestId('transaction-form'),
        );
        await page.getByRole('button', { name: /Back/ }).first().click();
      }
      await measure(
        'return-category-budget',
        page.getByRole('button', { name: /Back/ }).first(),
        page.getByTestId('budget-table'),
      );
      await measure(
        'previous-month',
        page.getByRole('button', { name: 'Previous month', exact: true }),
        page.getByTestId('budget-table'),
      );
      await measure(
        'next-month',
        page.getByRole('button', { name: 'Next month', exact: true }),
        page.getByTestId('budget-table'),
      );
      await measure(
        'accounts',
        nav.getByRole('link', { name: 'Accounts', exact: true }),
        page.getByLabel('Account list', { exact: true }),
      );
      await measure(
        'all-transactions',
        page.getByRole('button', { name: 'View All accounts transactions' }),
        page.getByLabel('Transaction list', { exact: true }),
      );
      await page.getByRole('button', { name: /Back/ }).first().click();
      await measure(
        'return-budget',
        nav.getByRole('link', { name: 'Budget', exact: true }),
        page.getByTestId('budget-table'),
      );
    }
  }
  fs.writeFileSync(
    process.env.ACTUAL_PERF_OUTPUT || '/tmp/actual-performance.json',
    JSON.stringify({ results }, null, 2),
  );
  for (const cpuRate of cpuRates) {
    rate = cpuRate;
    await client.send('Emulation.setCPUThrottlingRate', { rate });
    for (const coldAssets of [false, true]) {
      await client.send('Network.setCacheDisabled', {
        cacheDisabled: coldAssets,
      });
      await page.reload();
      await page.getByTestId('budget-table').waitFor({ timeout: 120_000 });
      await page.evaluate(
        () =>
          new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const timing = await page.evaluate(() => ({
        ms: performance.now(),
        longTasks: window.__householdPerf.longTasks,
        nodes: document.querySelectorAll('*').length,
      }));
      const name = coldAssets ? 'uncached-assets-reload' : 'warm-reload';
      results.push({ name, rate, ...timing });
      console.log(`benchmark: ${name} CPU${rate} ${Math.round(timing.ms)}ms`);
    }
  }
  fs.writeFileSync(
    process.env.ACTUAL_PERF_OUTPUT || '/tmp/actual-performance.json',
    JSON.stringify({ results }, null, 2),
  );
  await expect(page.getByTestId('budget-table')).toBeVisible();
  await context.close();
  const maxClickMs = Number(process.env.ACTUAL_PERF_MAX_CLICK_MS);
  if (maxClickMs > 0) {
    for (const result of results.filter(
      result => !result.name.includes('reload'),
    )) {
      expect(
        result.ms,
        `${result.name} at CPU${result.rate}`,
      ).toBeLessThanOrEqual(maxClickMs);
    }
  }
});
