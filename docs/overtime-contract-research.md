# Overtime Casino Contract Research

Research date: 2026-05-10

Source repo inspected: `thales-markets/contracts-v2` at commit `c44b93200774220bf09315077d713ffca641a703`.

Primary paths inspected:

- `contracts/core/Casino/`
- `scripts/deployContracts/deployCasino/`
- `scripts/deployments.json`
- `.openzeppelin/unknown-8453.json`
- `.openzeppelin/arbitrum-one.json`
- `.openzeppelin/optimism.json`
- `scripts/abi/Blackjack.json`

## Verified Findings

### 1. Upgradeable Proxy Architecture

Canonical Casino deployments use OpenZeppelin upgradeable proxies.

Evidence:

- `Blackjack.sol` inherits `Initializable`, `ProxyOwned`, `ProxyPausable`, and `ProxyReentrancyGuard`.
- `scripts/deployContracts/deployCasino/deployBlackjack.js` deploys with `upgrades.deployProxy(Blackjack, [], { initializer: false, initialOwner: protocolDAOAddress })`.
- The same deploy script records:
  - `Blackjack`
  - `BlackjackImplementation`
  - `BlackjackProxyAdmin`
- OpenZeppelin manifests for Base, Arbitrum, and Optimism list the Blackjack proxy addresses with `"kind": "transparent"`.
- Blockscout live checks identify the deployed Blackjack addresses as `proxy_type: eip1967`.

Conclusion: frontend transactions should target the proxy contract address, not the implementation address. The implementation ABI can be used to encode calls to the proxy.

### 2. Deployment / Config Files

Network names in `hardhat.config.js`:

- Base: `baseMainnet`, chain ID `8453`
- Arbitrum: `arbitrumOne`, chain ID `42161`
- Optimism: `optimisticEthereum`, chain ID `10`

Deployment address source:

- `scripts/deployments.json`

OpenZeppelin proxy manifests:

- Base: `.openzeppelin/unknown-8453.json`
- Arbitrum: `.openzeppelin/arbitrum-one.json`
- Optimism: `.openzeppelin/optimism.json`

Deploy scripts:

- `scripts/deployContracts/deployCasino/deployBlackjack.js`
- `scripts/deployContracts/deployCasino/deployRoulette.js`
- `scripts/deployContracts/deployCasino/deployDice.js`
- `scripts/deployContracts/deployCasino/deployBaccarat.js`
- `scripts/deployContracts/deployCasino/deploySlots.js`
- `scripts/deployContracts/deployCasino/deployCasinoData.js`

### 3. Public Deployed Addresses in Repo

`scripts/deployments.json` contains public Blackjack deployment addresses for Base, Arbitrum, and Optimism.

Base `baseMainnet`:

- Blackjack proxy: `0x1500b398AD5F6a0AdA60D1f2b433126bBFE9B0FC`
- Blackjack implementation: `0x6C200bD519d9B76F1F5fc0B37c892AA46f841853`
- Blackjack proxy admin: `0x6bB66cE9aF3c6Fec09D8620b7C67F77Fa7e23cFF`
- Default collateral: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- WETH: `0x4200000000000000000000000000000000000006`
- OVER: `0x7750c092e284e2c7366f50c8306f43c7eb2e82a2`

Arbitrum `arbitrumOne`:

- Blackjack proxy: `0x15EC8D1DFe47a2C4818dFDE8db2738aF48D26012`
- Blackjack implementation: `0x2f1448D0Dad648A20DBF654c5c61dDB61Cb5999d`
- Blackjack proxy admin: `0x322860C4c0cd1C286631761C042eb3beb518350C`
- Default collateral: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- WETH: `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1`
- OVER: `0x5829d6fe7528bc8e92c4e81cc8f20a528820b51a`

Optimism `optimisticEthereum`:

- Blackjack proxy: `0xf8c6314408BF0D9B0F790b1Ff88FDF4b29097AF2`
- Blackjack implementation: `0x90Fe757a860e7744309FE8FfbF20139046AE4F7e`
- Blackjack proxy admin: `0xD2cDC17a14B1544c52E1a157694D22a6b95d6803`
- Default collateral: `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`
- WETH: `0x4200000000000000000000000000000000000006`
- OVER: `0xedf38688b27036816a50185caa430d5479e1c63e`

Uncertainty: these are repo-published addresses and were partially cross-checked through Blockscout, but they should still be treated as deployment inputs requiring owner approval before wiring into the app.

### 4. ABIs

Repo-generated ABI files exist in `scripts/abi/`, including:

- `scripts/abi/Blackjack.json`
- `scripts/abi/Roulette.json`
- `scripts/abi/Dice.json`
- `scripts/abi/Baccarat.json`
- `scripts/abi/Slots.json`
- `scripts/abi/CasinoData.json`

Live Blockscout checks:

- Base Blackjack proxy is an EIP-1967 proxy and reports implementation `0x6C200bD519d9B76F1F5fc0B37c892AA46f841853`; Blockscout returned `abi: null` for that implementation during this check.
- Arbitrum Blackjack proxy is an EIP-1967 proxy and reports implementation `0x2f1448D0Dad648A20DBF654c5c61dDB61Cb5999d`; Blockscout returned a Blackjack ABI for the implementation.
- Optimism Blackjack proxy is an EIP-1967 proxy and reports implementation `0x90Fe757a860e7744309FE8FfbF20139046AE4F7e`; Blockscout returned a Blackjack ABI for the implementation.

Conclusion: the repo contains exact generated ABIs. Explorer ABI availability appears mixed by network in Blockscout, so the repo ABI should be the canonical source unless a verified explorer source is explicitly selected during integration review.

### 5. Exact Blackjack User Entrypoints

From `contracts/core/Casino/Blackjack.sol` and `scripts/abi/Blackjack.json`:

```solidity
function placeBet(address collateral, uint256 amount, address _referrer) external returns (uint256 handId, uint256 requestId)
function hit(uint256 handId) external returns (uint256 requestId)
function stand(uint256 handId) external returns (uint256 requestId)
function doubleDown(uint256 handId) external returns (uint256 requestId)
function split(uint256 handId) external returns (uint256 requestId)
function cancelHand(uint256 handId) external
```

Also present:

```solidity
function placeBetWithFreeBet(address collateral, uint256 amount) external returns (uint256 handId, uint256 requestId)
function adminCancelHand(uint256 handId) external
function rawFulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external
```

Requested names not found:

- No external `deal(...)` user function exists. Initial deal is requested by `placeBet(...)` and fulfilled through VRF.
- No `cancelBet(...)` function exists for Blackjack. The user cancellation entrypoint is `cancelHand(uint256 handId)`.
- Blackjack uses `HandCreated`, `HandResolved`, and `HandCancelled` events, not `BetPlaced`, `BetResolved`, or `BetCancelled`.

### 6. Collateral Decimals and Approval Flow

Supported collateral is initialized as USDC, WETH, and OVER in `Blackjack.initialize(...)`.

Decimals / units:

- USDC is treated as 6 decimals in Blackjack via `USDC_UNIT = 1e6`.
- WETH is treated as 18-decimal value by the `_getUsdValue` formula `amount * price / 1e18`.
- OVER is 18 decimals in `contracts/over_token/OverToken.sol`.

Approval / transfer flow:

- `placeBet(collateral, amount, _referrer)` calls `IERC20(collateral).safeTransferFrom(msg.sender, address(this), amount)`.
- `doubleDown(handId)` calls `safeTransferFrom` for the additional matching stake.
- `split(handId)` calls `safeTransferFrom` for the additional matching stake.

Frontend implication:

- The user must approve the Blackjack proxy address as spender for at least the stake amount before `placeBet`.
- If double-down or split actions are enabled, the frontend must either pre-approve enough allowance for possible additional stake or prompt for additional approval before those actions.
- Amounts must be encoded in token base units: USDC 6 decimals; WETH and OVER 18 decimals.

### 7. Referrer Event Signature

Exact Blackjack event:

```solidity
event ReferrerPaid(address indexed referrer, address indexed user, uint256 amount, uint256 betAmount, address collateral)
```

Notes:

- `collateral` is not indexed in the Blackjack ABI.
- Referral setup happens in `placeBet`: if `_referrer != address(0)` and `referrals` is configured, the contract calls `referrals.setReferrer(_referrer, msg.sender)`.
- Referral payout happens after a losing resolved hand through `_payReferrer(...)`, which emits `ReferrerPaid(...)` only if token transfer to the referrer succeeds.

### 8. Proxy vs Implementation Target

Frontend integrations should target the Blackjack proxy address for reads and writes.

Rationale:

- `deployBlackjack.js` stores `Blackjack` as the proxy address and separately stores `BlackjackImplementation` and `BlackjackProxyAdmin`.
- OpenZeppelin manifests identify the Blackjack deployment address as a transparent proxy.
- The proxy holds the user-facing address and delegates to the implementation.
- Calling the implementation directly would not use the proxy state and is not the canonical user flow.

Use the Blackjack ABI from `scripts/abi/Blackjack.json` to encode calls against the proxy address.

## Uncertainties / Integration Guardrails

- Repo-published addresses exist, but app integration should still wait for explicit confirmation that these are the intended production addresses for this affiliate wrapper.
- Base implementation ABI was not returned by Blockscout during the live check, even though the proxy was identified as an EIP-1967 proxy. This may be explorer-specific.
- The app should not use `BetResolved` naming for Blackjack. The exact event is `HandResolved`.
- The app should not expose a `deal` or `cancelBet` call for Blackjack unless a later verified ABI introduces those names.
- Real-money app wiring should stay disabled until the chosen network, proxy address, ABI file, collateral addresses, and affiliate wallet are explicitly approved.

