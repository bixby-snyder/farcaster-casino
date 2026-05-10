import { isAddress } from "viem";

export const OVERTIME_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "8453"
);

export const OVERTIME_BLACKJACK_ADDRESS =
  process.env.NEXT_PUBLIC_OVERTIME_BLACKJACK_ADDRESS ?? "";

export const AFFILIATE_REFERRER_ADDRESS =
  process.env.NEXT_PUBLIC_AFFILIATE_REFERRER_ADDRESS ?? "";

export const SUPPORTED_COLLATERALS = [
  {
    symbol: "USDC",
    decimals: 6,
    address: process.env.NEXT_PUBLIC_USDC_ADDRESS ?? "",
  },
  {
    symbol: "WETH",
    decimals: 18,
    address: process.env.NEXT_PUBLIC_WETH_ADDRESS ?? "",
  },
  {
    symbol: "OVER",
    decimals: 18,
    address: process.env.NEXT_PUBLIC_OVER_ADDRESS ?? "",
  },
] as const;

export type CollateralSymbol = (typeof SUPPORTED_COLLATERALS)[number]["symbol"];
export type SupportedCollateral = (typeof SUPPORTED_COLLATERALS)[number];

export function hasVerifiedOvertimeConfig() {
  return (
    OVERTIME_CHAIN_ID === 8453 &&
    isAddress(OVERTIME_BLACKJACK_ADDRESS) &&
    isAddress(AFFILIATE_REFERRER_ADDRESS)
  );
}
