# cashfl0w-swap

> Swap API relay — [0x](https://0x.org) aggregator with **our affiliate fee on top**.

Non-custodial. Users execute swaps through our API; 0x routes them across 100+
liquidity sources; and we collect a small fee on every swap, on-chain, directly
into our wallet.

## The business

- 0x charges **0.15%** on swaps involving select token pairs (standard plan).
- We add our affiliate fee on top via `swapFeeRecipient` + `swapFeeBps`.
- **Default: 10 bps (0.10%)** → the end user pays **≈0.25% total**.

No custody, no locked funds: the fee is paid to our wallet inside the swap
transaction itself, in the token the user receives (or sends — configurable).

## Endpoints

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET`  | `/` | Service info + our fee config |
| `GET`  | `/price` | Indicative price (with our fee) |
| `GET`  | `/quote` | Firm quote + executable calldata (with our fee) |
| `POST` | `/swap` | Firm quote, requires `taker` (the executing wallet) |
| `GET`  | `/fees/:chainId/:token` | Our accumulated fees (balance of the fee recipient) |

All swap endpoints take 0x v2 params: `chainId`, `sellToken`, `buyToken`,
`sellAmount` **or** `buyAmount`, `taker`, `slippageBps`. `ETH` is accepted and
normalized to 0x's native-token address.

### Example

```sh
curl "http://localhost:8787/price?sellToken=ETH&buyToken=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913&sellAmount=1000000000000000&taker=0xYOUR_WALLET"
```

## Configuration

| Env var           | Default                                    | Purpose |
| ----------------- | ------------------------------------------ | ------- |
| `FEE_BPS`         | `10` (0.10%)                               | Our affiliate fee in basis points |
| `FEE_RECIPIENT`   | **required**                               | Wallet that receives our fees |
| `FEE_TOKEN`       | `buy`                                      | Collect fee in `buy` or `sell` token |
| `CHAIN_ID`        | `8453` (Base)                              | Default chain |
| `RPC_URL`         | `https://mainnet.base.org`                 | RPC for the `/fees` endpoint |
| `ZEROEX_API_KEY`  | —                                          | 0x API key (**required** for swaps) |

`FEE_RECIPIENT` is validated and refuses to run with the zero address — set it
to your wallet.

### Getting a 0x API key (free)

1. Create an account at https://dashboard.0x.org/apps
2. Create an app to get your API key
3. Set it as `ZEROEX_API_KEY` (env / `wrangler secret put ZEROEX_API_KEY`)

Without a key, swap requests return `401 No API key found` (the rest of the
service works).

## Run locally

```sh
npm install
npm run dev        # http://localhost:8787
```

## Deploy (Cloudflare Workers)

```sh
npm run build
npx wrangler secret put ZEROEX_API_KEY   # and set FEE_RECIPIENT in wrangler.jsonc
npx wrangler deploy
```

## Development

```sh
npm run typecheck
npm test           # 13 unit tests (no network required)
```

## License

MIT
