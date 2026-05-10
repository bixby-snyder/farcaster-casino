import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export const overtimeCasinoEventAbi = parseAbi([
  "event ReferrerPaid(address indexed referrer, address indexed user, uint256 amount, uint256 betAmount, address indexed collateral)",
]);

