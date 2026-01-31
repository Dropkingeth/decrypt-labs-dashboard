# $DECRYPT Tokenomics
*v1.0 | Decrypt Labs*

---

## Overview

$DECRYPT is a deflationary token backed by real trading bot performance. Unlike typical utility tokens that gate access, $DECRYPT derives value from **monthly buybacks funded by actual trading profits**.

**The flywheel:**
```
Bots Trade → Profits Generated → Maintenance Fees Extracted → 40% → Buybacks → Supply Decreases → Price Pressure
```

---

## Token Distribution (Virtuals Unicorn Launch)

**Total Supply:** 1,000,000,000 (1 Billion)

**Launch Type:** Virtuals Protocol Unicorn Launch
- Bonding curve until 42k $VIRTUAL accumulated
- Auto-graduation to Uniswap V2
- 99% trading tax at TGE, decays 1% per minute until 1%

| Allocation | Tokens | % | Purpose |
|------------|--------|---|---------|
| 💧 Liquidity Pool | 450,000,000 | 45% | DEX liquidity (locked) |
| 👨‍🔬 Team | 250,000,000 | 25% | Engineers — vested via bonding curve |
| 📈 Capital Formation | 250,000,000 | 25% | Automated funding (2M-160M FDV range) |
| 🎁 Airdrops | 50,000,000 | 5% | 2% veVIRTUAL holders, 3% ACP users |

### Visual Breakdown
```
Liquidity Pool █████████████████████████████████████████████  45%
Team           █████████████████████████                      25%
Capital Form.  █████████████████████████                      25%
Airdrops       █████                                           5%
```

### Why Virtuals Unicorn?
- **Conviction-driven** — Early believers get asymmetric upside
- **Aligned incentives** — Team tokens vest based on performance
- **Clean price discovery** — Bonding curve prevents manipulation
- **Real funding** — Capital Formation provides operational runway

---

## Vesting Schedules

### Team Tokens (15% — 150M)
| Milestone | Tokens Unlocked | Cumulative |
|-----------|-----------------|------------|
| Launch | 0 | 0% |
| 6 Month Cliff | 37,500,000 | 25% |
| Month 7-18 (Linear) | 9,375,000/mo | 25% → 100% |

**Why the cliff?** Machines don't run without engineers. But engineers don't get paid until the machines prove themselves.

### Treasury (20% — 200M)
- No lockup — operational flexibility
- Primary use: Buyback reserve when profits are thin
- Monthly transparency reports on treasury movements
- Multi-sig controlled (3/5)

### Marketing (10% — 100M)
- 25% unlocked at launch (25M)
- 75% released quarterly over 12 months
- Used for: KOL partnerships, exchange listings, community events

### Community/Airdrops (25% — 250M)
- Initial airdrop: 50M tokens (20%)
- Holder rewards: 100M tokens (40%) over 12 months
- Future community incentives: 100M (40%) — governance decided

---

## Buyback Mechanics

### How It Works

Every month, bot profits are tallied and allocated:

```
Monthly Profit: $50,000 (example)
        ↓
┌─────────────────────────────────────┐
│  MAINTENANCE FEE BREAKDOWN          │
├─────────────────────────────────────┤
│  🔥 Buybacks      40%  →  $20,000   │
│  🏦 Treasury      20%  →  $10,000   │
│  👨‍🔬 Engineers     20%  →  $10,000   │
│  ⛽ Fuel (Scale)  10%  →  $5,000    │
│  🔧 Repairs       5%   →  $2,500    │
│  🛡️ Insurance     5%   →  $2,500    │
└─────────────────────────────────────┘
```

### Buyback Execution
1. **Calculation** — First of each month, previous month's profits tallied
2. **Allocation** — 40% marked for buyback
3. **Execution** — Market buy on DEX (Uniswap on Base)
4. **Burn** — 100% of bought tokens sent to dead address
5. **Receipt** — On-chain tx posted to dashboard + socials

### Buyback Pressure Scaling

As AUM grows, so does buyback power:

| AUM | Estimated Monthly Profit* | Buyback Amount (40%) |
|-----|---------------------------|----------------------|
| $150K | $3,000 - $7,500 | $1,200 - $3,000 |
| $300K | $6,000 - $15,000 | $2,400 - $6,000 |
| $500K | $10,000 - $25,000 | $4,000 - $10,000 |
| $1M | $20,000 - $50,000 | $8,000 - $20,000 |
| $5M | $100,000 - $250,000 | $40,000 - $100,000 |

*Assumes 2-5% monthly return on AUM

### Why Burn?

Buyback-and-burn creates permanent supply reduction. Unlike buyback-and-hold:
- No sell pressure from treasury dumps
- Deflationary by design
- Simple, auditable, trustless

---

## Maintenance Fee Structure (Detailed)

| Fee | % | Monthly ($50K profit) | Purpose |
|-----|---|----------------------|---------|
| 🔥 **Buybacks** | 40% | $20,000 | Token burns — direct value to holders |
| 🏦 **Treasury** | 20% | $10,000 | Operations, listings, legal, infra |
| 👨‍🔬 **Engineers** | 20% | $10,000 | Team compensation — keep machines running |
| ⛽ **Fuel** | 10% | $5,000 | Account scaling — grow the AUM |
| 🔧 **Repairs** | 5% | $2,500 | Drawdown recovery buffer |
| 🛡️ **Insurance** | 5% | $2,500 | Emergency reserve (black swan events) |

### Fee Philosophy

- **40% to buybacks** is aggressive but sustainable
- **Fuel (10%)** compounds AUM → more profits → more buybacks
- **Repairs + Insurance (10%)** = safety net for bad months
- **No fee goes to "marketing wallet" dumps** — marketing funded from Treasury with oversight

---

## Price Projection Scenarios

**Assumptions:**
- Launch MC: $500K
- Starting AUM: $300K
- Monthly bot performance: 2-5% on AUM
- All buybacks burned

### Conservative Scenario
*2% monthly returns, slow AUM growth*

| Month | AUM | Monthly Profit | Buyback | Cumulative Burned |
|-------|-----|----------------|---------|-------------------|
| 1 | $300K | $6,000 | $2,400 | $2,400 |
| 3 | $350K | $7,000 | $2,800 | $8,000 |
| 6 | $400K | $8,000 | $3,200 | $17,000 |
| 12 | $500K | $10,000 | $4,000 | $42,000 |

**Year 1 Total Buybacks:** ~$42,000
**Implied Price Support:** 8.4% of initial MC in buy pressure

### Moderate Scenario  
*3.5% monthly returns, steady AUM growth*

| Month | AUM | Monthly Profit | Buyback | Cumulative Burned |
|-------|-----|----------------|---------|-------------------|
| 1 | $300K | $10,500 | $4,200 | $4,200 |
| 3 | $450K | $15,750 | $6,300 | $16,000 |
| 6 | $700K | $24,500 | $9,800 | $43,000 |
| 12 | $1.2M | $42,000 | $16,800 | $120,000 |

**Year 1 Total Buybacks:** ~$120,000
**Implied Price Support:** 24% of initial MC in buy pressure

### Bullish Scenario
*5% monthly returns, aggressive scaling*

| Month | AUM | Monthly Profit | Buyback | Cumulative Burned |
|-------|-----|----------------|---------|-------------------|
| 1 | $300K | $15,000 | $6,000 | $6,000 |
| 3 | $600K | $30,000 | $12,000 | $30,000 |
| 6 | $1.5M | $75,000 | $30,000 | $100,000 |
| 12 | $5M | $250,000 | $100,000 | $500,000 |

**Year 1 Total Buybacks:** ~$500,000
**Implied Price Support:** 100% of initial MC in buy pressure

### What This Means

Even in the **conservative** scenario, $DECRYPT receives consistent buy pressure from real revenue. This isn't emission-funded yield or Ponzi mechanics — it's profit sharing through burns.

---

## Old Model vs. New Model

### ❌ Old "Access-Gated" Model
*Hold X tokens to access indicators/bots*

| Aspect | Problem |
|--------|---------|
| Legal Risk | Howey test concerns — token = investment contract |
| Price Action | Dumps when users get access and leave |
| Sustainability | Requires constant new buyers |
| Value Accrual | None — holding just unlocks a door |

### ✅ New "Buyback-Backed" Model
*Token earns value from real profits*

| Aspect | Advantage |
|--------|-----------|
| Legal Clarity | Token doesn't gate anything — cleaner structure |
| Price Action | Consistent buy pressure from monthly buybacks |
| Sustainability | Profitable bots = infinite game |
| Value Accrual | Burns reduce supply, profits increase buyback size |

### The Key Insight

Access-gated tokens need **new buyers** to maintain value.  
Buyback-backed tokens need **profitable operations** to maintain value.

One is a treadmill. The other is a flywheel.

---

## Token Utility

### Current Utility
- **Governance** (planned) — Vote on bot strategies, scaling priorities
- **Staking** (planned) — Boost rewards for long-term holders
- **Status** — Holder tiers unlock dashboard features, early access

### Explicit Non-Utility
- **NOT required** to access indicators (stays on main site)
- **NOT required** to view dashboard (public transparency)
- **NOT a revenue share** — buybacks are market operations, not dividends

---

## Security & Transparency

### Multi-Sig Treasury
- 3/5 signatures required for treasury movements
- Signers: 2 team, 2 advisors, 1 community elected
- All transactions posted publicly

### On-Chain Verification
- Every buyback = verifiable tx hash
- Burn address public and trackable
- Dashboard shows real-time supply metrics

### Monthly Reports
- Profit breakdown
- Buyback execution receipts
- Treasury movements
- Bot performance metrics

---

## Summary

$DECRYPT isn't a meme with promises. It's a token backed by machines that work.

```
Bots run → Profits flow → Burns happen → Supply shrinks → Value accrues
```

The only question is: how well do the machines perform?

Watch them work. That's the whole point.

---

*Tokenomics subject to final review before launch. Numbers are projections, not guarantees.*
