'use strict';

function cents(value) {
  if (typeof value !== 'string' || !/^-?\d+(\.\d{1,2})?$/.test(value)) {
    throw new Error('Invalid provider balance');
  }
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Unsafe provider balance');
  return negative ? -result : result;
}

function planAdjustments({ mappings, accounts, feed, balances, now }) {
  const actualIds = new Set();
  const feedIds = new Set();
  return mappings.map(mapping => {
    if (actualIds.has(mapping.actualId) || feedIds.has(mapping.simplefinId)) {
      throw new Error('Refusing duplicate mapping');
    }
    actualIds.add(mapping.actualId);
    feedIds.add(mapping.simplefinId);
    const local = accounts.find(a => a.id === mapping.actualId);
    const matches = feed.filter(a => a.id === mapping.simplefinId);
    if (!local || !local.offbudget || local.closed) {
      throw new Error('Only existing open off-budget accounts are eligible');
    }
    if (local.account_id && (local.account_id !== mapping.simplefinId || local.account_sync_source !== 'simpleFin')) {
      throw new Error('Unexpected existing bank link');
    }
    if (matches.length !== 1) throw new Error('Missing or ambiguous provider account');
    const remote = matches[0];
    if (remote.currency !== 'USD' && !(remote.currency === '' && mapping.allowBlankCurrency)) {
      throw new Error('Unexpected provider currency');
    }
    const timestamp = remote['balance-date'] * 1000;
    if (!Number.isFinite(timestamp) || timestamp > now + 300000 || now - timestamp > 72 * 3600000) {
      throw new Error('Missing, future, or stale provider timestamp');
    }
    const target = cents(remote.balance);
    const current = balances[local.id];
    if (!Number.isSafeInteger(current)) throw new Error('Invalid ledger balance');
    const amount = target - current;
    if (!Number.isSafeInteger(amount)) throw new Error('Unsafe adjustment');
    return { actualId: local.id, simplefinId: remote.id, current, target, amount, timestamp, unlink: Boolean(local.account_id) };
  });
}

async function checkedSync(internal) {
  const result = await internal.send('sync');
  if (result?.error) throw new Error('Budget sync failed: ' + (result.error.reason || 'unknown'));
  return result;
}

module.exports = { planAdjustments, checkedSync };
