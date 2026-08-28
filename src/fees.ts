import { createPublicClient, formatUnits, http } from 'viem';
import type { Config } from './config.js';

const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  }
] as const;

const RPC_BY_CHAIN: Record<number, string> = {
  1: 'https://ethereum-rpc.publicnode.com',
  10: 'https://mainnet.optimism.io',
  137: 'https://polygon-rpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  8453: 'https://mainnet.base.org'
};

const NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export type FeeBalance = {
  chainId: number;
  token: string;
  tokenKind: 'native' | 'erc20';
  rawBalance: string;
  formatted: string;
  decimals: number;
};

/**
 * Read our accumulated affiliate fees: the balance of the fee recipient
 * wallet for a given token on a given chain. `ETH` or the native placeholder
 * reads native balance; any other address reads ERC-20 balance.
 */
export async function feeBalance(
  cfg: Config,
  chainId: number,
  token: string,
  rpcUrl?: string
): Promise<FeeBalance> {
  const rpc = rpcUrl ?? RPC_BY_CHAIN[chainId] ?? cfg.rpcUrl;
  const client = createPublicClient({ transport: http(rpc) });

  if (token === 'ETH' || token.toLowerCase() === NATIVE) {
    const bal = await client.getBalance({ address: cfg.feeRecipient });
    return {
      chainId,
      token: 'ETH',
      tokenKind: 'native',
      rawBalance: bal.toString(),
      formatted: formatUnits(bal, 18),
      decimals: 18
    };
  }

  const address = token as `0x${string}`;
  const [bal, decimals] = await Promise.all([
    client.readContract({
      address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [cfg.feeRecipient]
    }),
    client.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' })
  ]);

  return {
    chainId,
    token,
    tokenKind: 'erc20',
    rawBalance: bal.toString(),
    formatted: formatUnits(bal, decimals),
    decimals
  };
}
