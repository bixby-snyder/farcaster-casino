import { parseAbi } from "viem";

export const blackjackIntegrationStatus = {
  source:
    "github.com/thales-markets/contracts-v2/contracts/core/Casino/",
  supportedNetworks: ["Base", "Optimism", "Arbitrum"],
  supportedCollateral: ["USDC", "WETH", "OVER"],
  randomnessFlow:
    "placeBet -> requestRandomWords -> rawFulfillRandomWords -> BetResolved",
  unresolved:
    "Exact deployed Blackjack contract address and exact placeBet/deal/cancel ABI are not present in this repo.",
} as const;

// TODO(overtime): Add only the verified Blackjack ABI from
// thales-markets/contracts-v2/contracts/core/Casino after deployment details are
// supplied. The exact placeBet signature must include the referrer parameter so
// every real-money bet passes NEXT_PUBLIC_AFFILIATE_REFERRER_ADDRESS.
export const blackjackPlaceholderAbi = parseAbi([
  "event ReferrerPaid(address indexed referrer, address indexed user, uint256 amount, uint256 betAmount, address indexed collateral)",
]);

