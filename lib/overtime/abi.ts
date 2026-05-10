import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export const overtimeCasinoEventAbi = parseAbi([
  "event ReferrerPaid(address indexed referrer, address indexed user, uint256 amount, uint256 betAmount, address collateral)",
]);

export const blackjackVerifiedAbi = parseAbi([
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
