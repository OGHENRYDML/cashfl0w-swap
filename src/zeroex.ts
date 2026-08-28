import type { Config } from './config.js';

/**
 * 0x Swap API v2 (AllowanceHolder flow) — the current production base URL.
 * Note: an `0x-api-key` header is REQUIRED (free key at https://dashboard.0x.org/apps).
 */
export const ZEROEX_API_BASE = 'https://api.0x.org/swap/allowance-holder';

/** 0x's canonical address for the native token (used instead of the 'ETH' symbol in v2). */
export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/** Map the `ETH` symbol to 0x's native-token address; pass everything else through. */
export function normalizeToken(t: string): string {
  return t === 'ETH' || t.toLowerCase() === 'eth' ? NATIVE_TOKEN : t;
}

export type SwapParams = {
  chainId?: number;
  sellToken: string;
  buyToken: string;
  /** Amount in base units (one of sellAmount / buyAmount). */
  sellAmount?: string;
  buyAmount?: string;
  /** The wallet that will execute the swap. */
  taker?: string;
  slippageBps?: number;
};

export function headers(cfg: Config): Record<string, string> {
  const h: Record<string, string> = { '0x-version': 'v2' };
  if (cfg.zeroExApiKey) h['0x-api-key'] = cfg.zeroExApiKey;
  return h;
}

/**
 * Build the 0x query string, injecting our affiliate fee parameters.
 *
 * This is the whole business: `swapFeeRecipient` + `swapFeeBps` tell 0x to pay
 * us `feeBps` (in basis points) of each swap, on-chain, in `swapFeeToken`.
 */
export function buildQuery(params: SwapParams, cfg: Config): URLSearchParams {
  const sellToken = normalizeToken(params.sellToken);
  const buyToken = normalizeToken(params.buyToken);

  const q = new URLSearchParams();
  q.set('chainId', String(params.chainId ?? cfg.defaultChainId));
  q.set('sellToken', sellToken);
  q.set('buyToken', buyToken);
  if (params.sellAmount) q.set('sellAmount', params.sellAmount);
  if (params.buyAmount) q.set('buyAmount', params.buyAmount);
  if (params.taker) q.set('taker', params.taker);
  if (params.slippageBps !== undefined) q.set('slippageBps', String(params.slippageBps));

  if (cfg.feeBps > 0) {
    q.set('swapFeeRecipient', cfg.feeRecipient);
    q.set('swapFeeBps', String(cfg.feeBps));
    q.set('swapFeeToken', cfg.feeToken === 'buy' ? buyToken : sellToken);
  }

  return q;
}

export async function proxyRequest(
  path: 'price' | 'quote',
  params: SwapParams,
  cfg: Config
): Promise<Response> {
  const url = `${ZEROEX_API_BASE}/${path}?${buildQuery(params, cfg)}`;
  return fetch(url, { headers: headers(cfg) });
}
