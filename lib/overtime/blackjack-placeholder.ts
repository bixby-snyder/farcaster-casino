import { parseAbi } from "viem";

export const blackjackIntegrationStatus = {
  source:
    "github.com/thales-markets/contracts-v2/contracts/core/Casino/",
  supportedNetworks: ["Base", "Optimism", "Arbitrum"],
  supportedCollateral: ["USDC", "WETH", "OVER"],
  randomnessFlow:
    "placeBet -> requestRandomWords -> rawFulfillRandomWords -> HandResolved",
  unresolved:
    "Real betting remains staged until the chosen deployed Blackjack proxy address and ABI are explicitly approved in app config.",
} as const;

// Verified from thales-markets/contracts-v2/scripts/abi/Blackjack.json.
// Keep real-money writes gated until the selected proxy address, collateral
// addresses, and affiliate referrer wallet are intentionally configured.
export const blackjackPlaceholderAbi = parseAbi([
  "function placeBet(address collateral, uint256 amount, address _referrer) returns (uint256 handId, uint256 requestId)",
  "function hit(uint256 handId) returns (uint256 requestId)",
  "function stand(uint256 handId) returns (uint256 requestId)",
  "function doubleDown(uint256 handId) returns (uint256 requestId)",
  "function split(uint256 handId) returns (uint256 requestId)",
  "function cancelHand(uint256 handId)",
  "event HandCreated(uint256 indexed handId, uint256 indexed requestId, address indexed user, address collateral, uint256 amount)",
  "event HandResolved(uint256 indexed handId, uint256 indexed requestId, address indexed user, uint8 result, uint256 payout)",
  "event HandCancelled(uint256 indexed handId, uint256 indexed requestId, address indexed user, uint256 refundedAmount, bool adminCancelled)",
  "event ReferrerPaid(address indexed referrer, address indexed user, uint256 amount, uint256 betAmount, address collateral)",
]);
