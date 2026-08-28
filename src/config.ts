export type Config = {
  /** 0x API key (optional in dev, required in production). */
  zeroExApiKey?: string;
  /** Our affiliate fee in basis points (10 = 0.10%). */
  feeBps: number;
  /** Wallet that receives our affiliate fees on-chain. */
  feeRecipient: `0x${string}`;
  /** Collect the fee in the buy token or the sell token. */
  feeToken: 'buy' | 'sell';
  /** Chain id used when a request omits one. */
  defaultChainId: number;
  /** RPC endpoint for the /fees balance endpoint. */
  rpcUrl: string;
};

const ZERO = '0x0000000000000000000000000000000000000000';
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export function loadConfig(
  env: Record<string, string | undefined> = process.env
): Config {
  const feeBps = Number(env.FEE_BPS ?? 10);
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) {
    throw new Error('FEE_BPS must be an integer between 0 and 1000');
  }

  const feeRecipient = env.FEE_RECIPIENT as `0x${string}` | undefined;
  if (
    !feeRecipient ||
    !ADDR_RE.test(feeRecipient) ||
    feeRecipient.toLowerCase() === ZERO
  ) {
    throw new Error(
      'FEE_RECIPIENT must be set to your wallet (a 0x address, not the zero address)'
    );
  }

  const feeToken = (env.FEE_TOKEN ?? 'buy').toLowerCase();
  if (feeToken !== 'buy' && feeToken !== 'sell') {
    throw new Error("FEE_TOKEN must be 'buy' or 'sell'");
  }

  return {
    zeroExApiKey: env.ZEROEX_API_KEY || undefined,
    feeBps,
    feeRecipient,
    feeToken,
    defaultChainId: Number(env.CHAIN_ID ?? 8453),
    rpcUrl: env.RPC_URL ?? 'https://mainnet.base.org'
  };
}
