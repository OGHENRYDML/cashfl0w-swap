import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Config } from '../src/config.js';
import { buildQuery, headers, NATIVE_TOKEN, normalizeToken, ZEROEX_API_BASE } from '../src/zeroex.js';

const cfg: Config = {
  feeBps: 10,
  feeRecipient: '0x1111111111111111111111111111111111111111',
  feeToken: 'buy',
  defaultChainId: 8453,
  rpcUrl: 'https://mainnet.base.org'
};

test('buildQuery injects our affiliate fee (buy token)', () => {
  const q = buildQuery(
    { sellToken: 'ETH', buyToken: '0xabc123', sellAmount: '1000000000000000000' },
    cfg
  );
  assert.equal(q.get('swapFeeRecipient'), cfg.feeRecipient);
  assert.equal(q.get('swapFeeBps'), '10');
  assert.equal(q.get('swapFeeToken'), '0xabc123'); // feeToken=buy -> buyToken
});

test('buildQuery collects fee in sell token when feeToken=sell', () => {
  const q = buildQuery(
    { sellToken: '0xdef456', buyToken: 'ETH', sellAmount: '1' },
    { ...cfg, feeToken: 'sell' }
  );
  assert.equal(q.get('swapFeeToken'), '0xdef456');
});

test('buildQuery omits fee params when feeBps is 0', () => {
  const q = buildQuery(
    { sellToken: 'ETH', buyToken: '0xabc123', sellAmount: '1' },
    { ...cfg, feeBps: 0 }
  );
  assert.equal(q.get('swapFeeRecipient'), null);
  assert.equal(q.get('swapFeeBps'), null);
});

test('buildQuery uses default chainId when omitted', () => {
  const q = buildQuery({ sellToken: 'ETH', buyToken: '0xabc123', sellAmount: '1' }, cfg);
  assert.equal(q.get('chainId'), '8453');
});

test('headers include api key only when configured', () => {
  const none = headers(cfg);
  assert.equal(none['0x-version'], 'v2');
  assert.equal(none['0x-api-key'], undefined);

  const withKey = headers({ ...cfg, zeroExApiKey: 'secret-key' });
  assert.equal(withKey['0x-api-key'], 'secret-key');
});

test('normalizeToken maps ETH to the native token address', () => {
  assert.equal(normalizeToken('ETH'), NATIVE_TOKEN);
  assert.equal(normalizeToken('eth'), NATIVE_TOKEN);
  assert.equal(normalizeToken('0xabc123'), '0xabc123');
});

test('buildQuery uses the AllowanceHolder endpoint base', () => {
  assert.equal(ZEROEX_API_BASE, 'https://api.0x.org/swap/allowance-holder');
});

test('buildQuery normalizes native token for sell/buy/swapFeeToken', () => {
  const q = buildQuery(
    { sellToken: 'ETH', buyToken: '0xabc123', sellAmount: '1' },
    { ...cfg, feeToken: 'buy' }
  );
  assert.equal(q.get('sellToken'), NATIVE_TOKEN);
  assert.equal(q.get('buyToken'), '0xabc123');
  assert.equal(q.get('swapFeeToken'), '0xabc123');
});
