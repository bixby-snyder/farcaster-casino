# Overtime Casino Affiliate Integration

This app is wired as an Overtime Casino affiliate wrapper while keeping the existing blackjack casino visual design.

## Wired

- Public config placeholders in `lib/overtime/config.ts`.
- `.env.example` with public placeholder keys only.
- ERC20 `approve` and `allowance` ABI definitions.
- Referrer affiliate event ABI for `ReferrerPaid(referrer, user, amount, betAmount, collateral)`.
- UI states for wallet connection, collateral selection, wager entry, approval, bet placement gating, pending VRF, resolved result, and stuck-bet recovery placeholder.
- Affiliate disclosure footer and `/affiliate-disclosure` route.

## Placeholder

The repo does not include the exact deployed Overtime Blackjack contract ABI/signature. The app intentionally does not invent a `placeBet` signature.

`lib/overtime/blackjack-placeholder.ts` marks the missing contract integration surface. Real-money bet placement must remain disabled until the exact ABI confirms how `_referrer` is passed.

## Still Required

- Verified `NEXT_PUBLIC_OVERTIME_BLACKJACK_ADDRESS` for Base, or a network-specific config expansion for Optimism and Arbitrum.
- Verified collateral token addresses for USDC, WETH, and OVER on the supported network.
- Verified affiliate referrer wallet address.
- Exact Blackjack ABI from `github.com/thales-markets/contracts-v2/contracts/core/Casino/`, including:
  - `placeBet` or equivalent deal entrypoint signature.
  - Any cancellation/recovery function for stuck bets.
  - Event signatures for `BetPlaced`, `BetResolved`, and `BetCancelled`.

## Safety Notes

- Do not commit private keys, mnemonics, wallet exports, production `.env` files, RPC secrets, or API secrets.
- Do not add unverified contract addresses.
- Every real-money bet must pass `NEXT_PUBLIC_AFFILIATE_REFERRER_ADDRESS` as `_referrer`.

