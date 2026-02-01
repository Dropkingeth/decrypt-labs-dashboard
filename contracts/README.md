# Decrypt Labs Smart Contracts

## Overview

Smart contracts for the Decrypt Labs Bot Fleet NFT system on Base chain.

## Contracts

| Contract | Purpose | Size |
|----------|---------|------|
| `BotNFT.sol` | ERC-721 NFT (20 max) with strategy metadata | ~7.5KB |
| `BotFleet.sol` | Slot management (Active/Broken/Waiting) | ~11KB |
| `FuelManager.sol` | Monthly fuel payments | ~8KB |
| `InsurancePool.sol` | Reset coverage (first free + monthly) | ~12KB |
| `RewardsDistributor.sol` | Profit distribution (70/20/10 split) | ~11KB |
| `TierGate.sol` | Token holder tier verification | ~8KB |

## Architecture

```
                              ┌─────────────────┐
                              │   $CIPHER       │
                              │  (Virtuals ERC20)│
                              └────────┬────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│    BotNFT       │          │   TierGate      │          │   Treasury      │
│  (20 NFTs)      │          │ (Token Tiers)   │          │   (Multi-sig)   │
└────────┬────────┘          └─────────────────┘          └─────────────────┘
         │                                                         ▲
         │                                                         │
         ▼                                                         │
┌─────────────────┐                                               │
│   BotFleet      │◄──────────────────────────────────────────────┤
│ (Slot Manager)  │                                               │
└────────┬────────┘                                               │
         │                                                         │
    ┌────┴────┬─────────────────┐                                 │
    ▼         ▼                 ▼                                 │
┌────────┐ ┌───────────┐ ┌──────────────┐                        │
│  Fuel  │ │ Insurance │ │   Rewards    │────────────────────────┘
│Manager │ │   Pool    │ │ Distributor  │
└────────┘ └───────────┘ └──────────────┘
```

## Key Features

### BotNFT.sol
- Max supply: 20 NFTs
- Mint price: $300 USD equivalent in $CIPHER
- 4 strategies: OTE Silver Bullet, FVG+IFVG, OTE Refined (High/Low)
- Strategy can be changed once per 30 days

### BotFleet.sol
- Manages slot statuses: INACTIVE, ACTIVE, BROKEN, WAITING
- 7-day grace period before slot becomes BROKEN
- First-come-first-served queue for reactivation
- Anyone can call `breakSlot()` after grace period (incentivizes monitoring)

### FuelManager.sol
- Monthly payment: ~$175 USD in $CIPHER
- Can prepay 1-12 months
- Grace period triggers when fuel expires
- Batch check for multiple slots

### InsurancePool.sol
- **First reset FREE** for all NFT holders
- Monthly insurance available after free reset used
- Two-phase claim process (submit → approve → process)
- Pool funded by premiums + 10% of rewards

### RewardsDistributor.sol
- **70%** to NFT holder
- **20%** to Operations (treasury)
- **10%** to Insurance Pool
- Minimum claim: $10 equivalent
- Bulk deposit and batch claim supported

### TierGate.sol
- Token holder verification for indicator/strategy access
- **Bronze:** Indicator only
- **Silver:** Indicator + 2 strategies
- **Gold:** Indicator + all 4 strategies
- **Diamond:** Full suite + priority support

## Security Features

All contracts include:
- `Ownable2Step` - Two-step ownership transfer
- `ReentrancyGuard` - Reentrancy protection
- `Pausable` - Emergency pause functionality
- `SafeERC20` - Safe token transfers
- Custom errors - Gas-efficient error handling

## Deployment Order

1. Deploy `$CIPHER` via Virtuals Protocol (handled by Virtuals)
2. Deploy `BotNFT` (needs $CIPHER address)
3. Deploy `BotFleet` (needs BotNFT address)
4. Deploy `FuelManager` (needs $CIPHER, BotNFT, treasury)
5. Deploy `InsurancePool` (needs $CIPHER, BotNFT, treasury)
6. Deploy `RewardsDistributor` (needs $CIPHER, BotNFT, treasury, InsurancePool)
7. Deploy `TierGate` (needs $CIPHER)
8. Configure cross-references:
   - `BotFleet.setFuelManager(FuelManager)`
   - `FuelManager.setBotFleet(BotFleet)`

## Configuration Values (TBD)

| Parameter | Placeholder | Notes |
|-----------|-------------|-------|
| NFT Mint Price | $300 in $CIPHER | Calculate based on token price |
| Monthly Fuel | $175 in $CIPHER | Calculate based on token price |
| Insurance Premium | TBD | Suggest 10-20% of reset cost |
| Reset Cost | ~$150 in $CIPHER | Apex reset cost equivalent |
| Min Claim | $10 in $CIPHER | Prevent dust claims |
| Bronze Threshold | X tokens | TBD based on supply |
| Silver Threshold | XX tokens | TBD |
| Gold Threshold | XXX tokens | TBD |
| Diamond Threshold | XXXX tokens | TBD |

## Testing

```bash
# Install dependencies
forge install

# Run tests
forge test

# Verbose tests
forge test -vvv

# Gas report
forge test --gas-report

# Coverage
forge coverage
```

## Deployment

### 1. Setup Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values:
# - PRIVATE_KEY: Your deployer wallet private key
# - TREASURY: Address to receive payments (optional)
# - BASESCAN_API_KEY: For contract verification
```

### 2. Get Base Sepolia ETH

Get testnet ETH from: https://www.alchemy.com/faucets/base-sepolia

### 3. Deploy to Testnet (with Mock CIPHER)

```bash
# Load environment
source .env

# Deploy with mock token for testing
forge script script/DeployTestnet.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  -vvvv

# Verify contracts (optional)
forge script script/DeployTestnet.s.sol \
  --rpc-url https://sepolia.base.org \
  --verify
```

### 4. Deploy to Mainnet (with real CIPHER)

```bash
# Set CIPHER_TOKEN to Virtuals-deployed address
export CIPHER_TOKEN=0x...

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  -vvvv
```

### 5. After Deployment

1. Save contract addresses
2. Update frontend with addresses
3. Test minting flow on testnet
4. Transfer ownership to multisig (for mainnet)

## Base Chain Info

- **Chain ID:** 8453 (mainnet), 84532 (Sepolia testnet)
- **Block time:** ~2 seconds
- **Gas:** Very low (~$0.001 per tx)
- **Explorer:** https://basescan.org

## Audit Checklist

Before mainnet:
- [ ] Slither static analysis
- [ ] Foundry fuzz tests
- [ ] Manual review of access control
- [ ] Verify all math (no overflows)
- [ ] Check reentrancy on all external calls
- [ ] Verify event emissions
- [ ] Test pause/unpause functionality
- [ ] Test ownership transfer
- [ ] Gas optimization review
- [ ] Professional audit (recommended)

## License

MIT
