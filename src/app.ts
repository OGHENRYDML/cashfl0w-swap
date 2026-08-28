import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { loadConfig, type Config } from './config.js';
import { feeBalance } from './fees.js';
import { proxyRequest, type SwapParams } from './zeroex.js';

const token = z.string().min(1).max(100);
const amount = z.string().regex(/^\d+$/, 'must be an integer (base units)');
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'must be a 0x address');

const baseQuote = z.object({
  chainId: z.coerce.number().int().positive().optional(),
  sellToken: token,
  buyToken: token,
  sellAmount: amount.optional(),
  buyAmount: amount.optional(),
  taker: address.optional(),
  slippageBps: z.coerce.number().int().min(0).max(10000).optional()
});

const oneAmount = (v: { sellAmount?: string; buyAmount?: string }) =>
  (v.sellAmount && !v.buyAmount) || (!v.sellAmount && v.buyAmount);

const quoteQuery = baseQuote.refine(oneAmount, {
  message: 'provide exactly one of sellAmount or buyAmount'
});

const swapBody = baseQuote
  .omit({ taker: true })
  .extend({ taker: address })
  .refine(oneAmount, { message: 'provide exactly one of sellAmount or buyAmount' });

export function createApp(cfg: Config = loadConfig()): Hono {
  const app = new Hono();

  app.get('/', (c) =>
    c.json({
      name: 'cashfl0w-swap',
      requiresApiKey: !cfg.zeroExApiKey,
      fee: {
        bps: cfg.feeBps,
        pct: `${(cfg.feeBps / 100).toFixed(2)}%`,
        recipient: cfg.feeRecipient,
        token: cfg.feeToken
      },
      note: 'end-user fee ≈ 0x (0.15% on select pairs) + our affiliate fee'
    })
  );

  app.get('/price', async (c) => {
    const parsed = quoteQuery.safeParse(c.req.query());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    return proxy(c, 'price', parsed.data, cfg);
  });

  app.get('/quote', async (c) => {
    const parsed = quoteQuery.safeParse(c.req.query());
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    return proxy(c, 'quote', parsed.data, cfg);
  });

  app.post('/swap', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid JSON body' }, 400);
    }
    const parsed = swapBody.safeParse(body);
    if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
    return proxy(c, 'quote', parsed.data, cfg);
  });

  app.get('/fees/:chainId/:token', async (c) => {
    const chainId = Number(c.req.param('chainId'));
    if (!Number.isInteger(chainId) || chainId <= 0) {
      return c.json({ error: 'invalid chainId' }, 400);
    }
    try {
      const bal = await feeBalance(cfg, chainId, c.req.param('token'), c.req.query('rpc'));
      return c.json(bal);
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : String(e) }, 502);
    }
  });

  return app;
}

async function proxy(
  c: Context,
  path: 'price' | 'quote',
  params: SwapParams,
  cfg: Config
): Promise<Response> {
  try {
    const res = await proxyRequest(path, params, cfg);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
}
