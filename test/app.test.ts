import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';

const cfg: Config = {
  feeBps: 10,
  feeRecipient: '0x1111111111111111111111111111111111111111',
  feeToken: 'buy',
  defaultChainId: 8453,
  rpcUrl: 'https://mainnet.base.org'
};

const originalFetch = globalThis.fetch;
let capturedUrl = '';
let capturedInit: RequestInit | undefined;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockFetch(body: string, status = 200): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(body, { status });
  }) as typeof fetch;
}

test('GET / returns fee summary', async () => {
  const app = createApp(cfg);
  const res = await app.request('/');
  assert.equal(res.status, 200);
  const j = (await res.json()) as { fee: { bps: number; pct: string } };
  assert.equal(j.fee.bps, 10);
  assert.equal(j.fee.pct, '0.10%');
});

test('GET /price injects our fee params into the 0x call', async () => {
  mockFetch('{"price":"1"}');
  const app = createApp(cfg);
  const res = await app.request(
    '/price?sellToken=ETH&buyToken=0xabc123&sellAmount=1000000000000000000'
  );
  assert.equal(res.status, 200);
  assert.match(capturedUrl, /swapFeeRecipient=0x1111111111111111111111111111111111111111/);
  assert.match(capturedUrl, /swapFeeBps=10/);
  assert.match(capturedUrl, /swapFeeToken=0xabc123/);
  const h = capturedInit?.headers as Record<string, string> | undefined;
  assert.equal(h?.['0x-version'], 'v2');
});

test('POST /swap requires taker', async () => {
  const app = createApp(cfg);
  const res = await app.request('/swap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sellToken: 'ETH', buyToken: '0xabc123', sellAmount: '1' })
  });
  assert.equal(res.status, 400);
});

test('POST /swap proxies quote with taker and fee', async () => {
  mockFetch('{"chainId":8453}');
  const app = createApp(cfg);
  const res = await app.request('/swap', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sellToken: 'ETH',
      buyToken: '0xabc123',
      sellAmount: '1000000000000000000',
      taker: '0x2222222222222222222222222222222222222222'
    })
  });
  assert.equal(res.status, 200);
  assert.match(capturedUrl, /\/quote\?/);
  assert.match(capturedUrl, /taker=0x2222222222222222222222222222222222222222/);
});

test('GET /price rejects invalid amount', async () => {
  const app = createApp(cfg);
  const res = await app.request('/price?sellToken=ETH&buyToken=0xabc123&sellAmount=abc');
  assert.equal(res.status, 400);
});
