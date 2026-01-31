# Decrypt Labs — Web3 Integration

## Overview

This folder contains the web3 integration modules for Decrypt Labs:

| File | Purpose |
|------|---------|
| `fee-calculator.js` | Calculate maintenance fee breakdown (40% buyback, taxes, etc.) |
| `wallet-connect.js` | Wallet connection, holder tier verification |
| `buyback-executor.js` | Monthly buyback execution (Jimmy's job) |

## Maintenance Fee Breakdown

```
Gross Profit
    ↓
Tax Set-Aside (30%)
    ↓
Net Profit
    ↓
┌────────────────────────────────────┐
│  🔥 Buybacks      40%  → Burns     │
│  🏦 Treasury      20%  → Ops       │
│  👨‍🔬 Engineers     20%  → Team      │
│  ⛽ Fuel          10%  → Scaling   │
│  🔧 Repairs        5%  → Buffer    │
│  🛡️ Insurance      5%  → Emergency │
└────────────────────────────────────┘
```

## Example Calculation

```javascript
const { calculateFromGrossProfit, formatBreakdown } = require('./fee-calculator');

const breakdown = calculateFromGrossProfit(10000);
console.log(formatBreakdown(breakdown));

// Output:
// Gross Profit:     $10,000
// Tax Set-Aside:    -$3,000 (30%)
// Net Profit:       $7,000
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔥 Buybacks (Token Burns)
//   40% → $2,800
// 🏦 Treasury (Operations)
//   20% → $1,400
// ...
// 💰 BUYBACK AMOUNT: $2,800
```

## Holder Tiers

| Tier | Minimum $DECRYPT | Benefits |
|------|------------------|----------|
| 💎 Diamond | 1,000,000 | All access + governance + priority |
| 🥇 Gold | 200,000 | All strategies + alerts |
| 🥈 Silver | 50,000 | Indicator + 2 strategies |
| 🥉 Bronze | 10,000 | 1 indicator |
| 👀 Spectator | 0 | Dashboard view only |

## Wallet Integration

```javascript
// Browser usage
const wallet = window.DecryptWallet;

// Connect
const result = await wallet.connect();
console.log(`Connected: ${result.address}`);
console.log(`Balance: ${result.balance} $DECRYPT`);
console.log(`Tier: ${result.tier}`);

// Listen for events
window.addEventListener('decrypt:walletConnected', (e) => {
  console.log('Wallet connected:', e.detail);
});

window.addEventListener('decrypt:balanceUpdated', (e) => {
  console.log('Balance updated:', e.detail);
});
```

## Monthly Buyback Flow (Jimmy's Job)

```javascript
const { executeMonthlyBuyback } = require('./buyback-executor');

// 1. Calculate (dry run)
const result = await executeMonthlyBuyback({
  grossProfit: 10000,  // From Tradovate scrape
  month: '2026-02',
  dryRun: true
});

// 2. Execute (live)
const liveResult = await executeMonthlyBuyback({
  grossProfit: 10000,
  month: '2026-02',
  signer: operationsWalletSigner,  // Ethers.js signer
  dryRun: false
});

// 3. Update data.json with buyback record
data.buybacks.push(liveResult.record);
```

## Configuration (Update After Token Launch)

In `wallet-connect.js` and `buyback-executor.js`, update:

```javascript
const CONFIG = {
  tokenAddress: '0x...', // $DECRYPT contract address
  // ...
};
```

## Chain Info

- **Chain:** Base (Coinbase L2)
- **Chain ID:** 8453
- **RPC:** https://mainnet.base.org
- **Explorer:** https://basescan.org

## Dependencies

For full functionality:
- `ethers.js` v6 (DEX interactions)
- Web3 wallet (MetaMask, Coinbase Wallet, etc.)

## Status

- [x] Fee calculator (complete)
- [x] Wallet connect (complete - needs token address)
- [x] Buyback executor (complete - needs ethers.js integration)
- [ ] DEX swap integration (needs ethers.js)
- [ ] Dashboard integration (pending)
- [ ] Token contract deployment (pending)
