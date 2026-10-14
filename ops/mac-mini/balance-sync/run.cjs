'use strict';
// Uses the pinned API already installed with the Mini's MCP bridge.
const fs = require('node:fs');
const path = require('node:path');
const { planAdjustments, checkedSync } = require('./plan.cjs');
process.umask(0o077);
const root = path.resolve(__dirname, '..');
let config;
const apply = process.argv.includes('--apply');
let api;
const lock = path.join(__dirname, '.running');
const reportPath = path.join(__dirname, apply ? 'last-run.json' : 'preview.json');
let locked = false;
let initialized = false;
let cache;
let unsyncedWrites = false;
const report = { started: new Date().toISOString(), apply, completed: false, stage: 'starting' };
function saveReport() {
  fs.writeFileSync(reportPath + '.tmp', JSON.stringify(report, null, 2));
  fs.renameSync(reportPath + '.tmp', reportPath);
}

async function main() {
  // A crash leaves a lock for inspection instead of risking overlapping writers.
  fs.mkdirSync(lock);
  locked = true;
  fs.writeFileSync(path.join(lock, 'pid'), String(process.pid));
  saveReport();
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  api = require(path.join(root, 'mcp/node_modules/@actual-app/api'));
  report.stage = 'download';
  saveReport();
  if (!config.budgetId || !Array.isArray(config.mappings) || config.mappings.length !== 9) {
    throw new Error('Expected the approved nine-account household mapping');
  }
  cache = fs.mkdtempSync(path.join(root, 'mcp/sessions/balance-sync-'));
  await api.init({ dataDir: cache, serverURL: 'http://127.0.0.1:5006', password: fs.readFileSync(path.join(root, 'server-password'), 'utf8').trim() });
  initialized = true;
  await api.downloadBudget(config.budgetId);
  await checkedSync(api.internal);
  report.stage = 'provider';
  saveReport();
  const accounts = await api.internal.send('accounts-get');
  const response = await api.internal.send('simplefin-accounts');
  if (!Array.isArray(response.accounts)) throw new Error('SimpleFIN did not return account balances');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const balances = {};
  for (const mapping of config.mappings) {
    balances[mapping.actualId] = await api.getAccountBalance(mapping.actualId, today);
  }
  // Validate every account before any mutation. API endpoint requests balances-only.
  const plan = planAdjustments({ mappings: config.mappings, accounts, feed: response.accounts, balances, now: Date.now() });
  Object.assign(report, { date: today, plan, stage: 'apply' });
  saveReport();
  let added = 0;
  if (apply) {
    for (const item of plan) {
      await checkedSync(api.internal);
      const current = await api.getAccountBalance(item.actualId, today);
      if (current !== item.current) throw new Error('Ledger changed during reconciliation; rerun after reviewing');
      if (item.unlink) {
        unsyncedWrites = true;
        await api.internal.send('account-unlink', { id: item.actualId });
      }
      if (item.amount !== 0) {
        unsyncedWrites = true;
        await api.addTransactions(item.actualId, [{
          date: today,
          amount: item.amount,
          payee_name: 'Investment balance adjustment',
          notes: `Balance-only tracking: total value from SimpleFIN as of ${new Date(item.timestamp).toISOString()}. Includes cash and holdings; not investment income or return.`,
          cleared: true,
        }], { learnCategories: false, runTransfers: false });
        added++;
      }
      if (await api.getAccountBalance(item.actualId, today) !== item.target) throw new Error('Adjustment verification failed');
      await checkedSync(api.internal);
      unsyncedWrites = false;
    }
    const finalAccounts = await api.internal.send('accounts-get');
    for (const item of plan) {
      const account = finalAccounts.find(a => a.id === item.actualId);
      if (account.account_id || account.bank || account.account_sync_source) throw new Error('Transaction sync remains linked');
    }
  }
  report.completed = true;
  report.stage = 'complete';
  report.adjustmentsAdded = added;
  saveReport();
  console.log('BALANCE_SYNC_SUMMARY ' + JSON.stringify({ apply, accounts: plan.length, adjustmentsNeeded: plan.filter(p => p.amount !== 0).length, adjustmentsAdded: added, completed: true }));
}

main().catch(error => {
  if (locked) {
    Object.assign(report, { completed: false, error: error.message, retainedCache: unsyncedWrites ? cache : undefined });
    saveReport();
  }
  console.error('BALANCE_SYNC_FAILED ' + error.message);
  process.exitCode = 1;
}).finally(async () => {
  try {
    if (initialized) await api.shutdown();
  } catch (error) {
    console.error('BALANCE_SYNC_SHUTDOWN_FAILED ' + error.message);
    process.exitCode = 1;
  } finally {
    if (cache && !unsyncedWrites) fs.rmSync(cache, { recursive: true, force: true });
    if (locked) fs.rmSync(lock, { recursive: true, force: true });
  }
});
