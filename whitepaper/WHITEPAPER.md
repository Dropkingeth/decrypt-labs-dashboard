# Decrypt Labs Whitepaper
## Autonomous Trading Bot Fleet — Powered by $CIPHER

**Version:** 1.0  
**Date:** February 2026  
**Website:** [decryptlabs.io](https://decryptlabs.io)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Introduction](#introduction)
3. [The Problem](#the-problem)
4. [Our Solution](#our-solution)
5. [Bot Fleet System](#bot-fleet-system)
6. [NFT Structure](#nft-structure)
7. [$CIPHER Token](#cipher-token)
8. [Fuel System](#fuel-system)
9. [Slot Management](#slot-management)
10. [Rewards Distribution](#rewards-distribution)
11. [Access System](#access-system)
12. [Technical Architecture](#technical-architecture)
13. [Roadmap](#roadmap)
14. [Risk Disclosure](#risk-disclosure)

---

## Executive Summary

Decrypt Labs introduces a revolutionary approach to algorithmic trading through a decentralized Bot Fleet system. Users can deploy autonomous trading bots by minting Bot NFTs, with all transactions and rewards powered by the $CIPHER token.

**Key Highlights:**
- 🤖 **20 Bot Fleet** — Limited supply creates scarcity and value
- 🎯 **4 Proven Strategies** — ICT-based algorithms with extensive backtesting
- 🪙 **$CIPHER Powered** — All payments and rewards in native token
- 📊 **Full Transparency** — Real-time dashboard tracking

---

## Introduction

### Vision

Decrypt Labs aims to democratize access to professional-grade algorithmic trading. Our AI-powered trading bots, developed using Inner Circle Trader (ICT) methodologies, have been extensively backtested with over 9,900+ simulated trades.

### Meet Jimmy Neutron 🧪

Jimmy Neutron is our AI trading assistant and the brain behind our bot strategies. Jimmy monitors markets 24/7, executes trades with precision, and continuously optimizes performance.

### Why Decrypt Labs?

- **Proven Strategies:** Our bots use battle-tested ICT concepts
- **Transparent Performance:** Every trade visible on our dashboard
- **Community Ownership:** NFT holders are part of the fleet
- **Token Ecosystem:** $CIPHER creates aligned incentives

---

## The Problem

### Traditional Trading Challenges

1. **Skill Gap:** Most retail traders lack the expertise to trade profitably
2. **Time Commitment:** Active trading requires constant market monitoring
3. **Emotional Trading:** Fear and greed lead to poor decisions
4. **High Barriers:** Professional trading tools are expensive and complex
5. **No Accountability:** Signal providers often lack transparency

### Existing Solutions Fall Short

- **Copy Trading:** Relies on human traders who can be inconsistent
- **Trading Bots:** Most are black boxes with no transparency
- **Signal Groups:** No accountability, often pump-and-dump schemes

---

## Our Solution

### The Bot Fleet Model

Decrypt Labs operates a fleet of **20 autonomous trading bots**, each owned by an NFT holder. This creates a unique model where:

1. **Ownership is clear** — NFT proves you own a bot slot
2. **Performance is transparent** — Dashboard shows all trades
3. **Incentives are aligned** — Everyone benefits from bot success
4. **Scarcity creates value** — Only 20 slots available

### How It Works

```
┌─────────────────────────────────────────────────┐
│  1. USER MINTS BOT NFT (pays $CIPHER)           │
│                    ↓                            │
│  2. SELECTS 1 OF 4 STRATEGIES                   │
│                    ↓                            │
│  3. PAYS MONTHLY FUEL ($CIPHER)                 │
│                    ↓                            │
│  4. BOT TRADES AUTONOMOUSLY                     │
│                    ↓                            │
│  5. BOT COMPLETES EVALUATION                    │
│                    ↓                            │
│  6. REWARDS DISTRIBUTED IN $CIPHER              │
└─────────────────────────────────────────────────┘
```

---

## Bot Fleet System

### Fleet Overview

| Specification | Details |
|---------------|---------|
| Total Bots | 20 (max capacity) |
| Strategies | 4 available |
| Status Types | Active, Broken, Waiting |
| Trading Venue | Futures (MNQ/MES) |
| Platform | Apex Trader Funding |

### Fleet Status Display

```
┌─────────────────────────────────────┐
│         BOT FLEET: 20/20            │
│  ⚡ 18 Active  💀 2 Broken  ⏳ 3 Queue │
└─────────────────────────────────────┘
```

### Bot Statuses

| Status | Icon | Description |
|--------|------|-------------|
| **Active** | ⚡ | Paid up, bot is trading |
| **Broken** | 💀 | Missed payment, slot released |
| **Waiting** | ⏳ | In queue for next opening |

---

## NFT Structure

### Simple & Equal

- **Supply:** 20 identical NFTs
- **Access:** Same benefits for all holders
- **Blockchain:** Base (Ethereum L2)
- **Standard:** ERC-721

### What You Get

| Benefit | Description |
|---------|-------------|
| 🤖 **Bot Slot** | Your personal bot in the fleet |
| 🎯 **Strategy Choice** | Pick 1 of 4 proven strategies |
| 📊 **Dashboard Access** | Real-time tracking of your bot |
| 🪙 **Token Rewards** | Claim $CIPHER when bot performs |
| 👥 **Community** | Exclusive holder access |

### Strategy Selection

At deployment, NFT holders choose ONE strategy:

| # | Strategy | Risk Level | Description |
|---|----------|------------|-------------|
| 1 | **OTE Silver Bullet** | Medium | Trades all valid OTE setups during kill zones |
| 2 | **FVG+IFVG** | Medium | Fair Value Gaps + Inverse FVG confirmation |
| 3 | **OTE Refined (High Risk)** | High | Selective days, higher size on proven setups |
| 4 | **OTE Refined (Low Risk)** | Low | Selective days, conservative position sizing |

### Strategy Deep Dive

**OTE Silver Bullet**
- Trades during all Silver Bullet windows (10-11 AM, 2-3 PM, 3-4 AM ET)
- Enters on Optimal Trade Entry within Fair Value Gaps
- Standard position sizing across all setups

**FVG+IFVG**
- Identifies Fair Value Gaps on higher timeframe
- Confirms with Inverse FVG for precision entry
- 1-minute execution timeframe

**OTE Refined (High Risk)**
- Only trades on statistically proven days (skips low-probability days)
- Increases position size on highest-probability setups
- Sits out during unfavorable market conditions
- Higher reward potential, higher drawdown risk

**OTE Refined (Low Risk)**
- Same selective day filtering as High Risk version
- Conservative position sizing (reduced contracts)
- Prioritizes account preservation over aggressive gains
- Ideal for risk-averse holders

*Strategy can be changed once per month (with bot reset)*

---

## $CIPHER Token

### Token Utility

$CIPHER is the native token powering the entire Decrypt Labs ecosystem:

| Use Case | Description |
|----------|-------------|
| **Mint NFT** | Purchase Bot NFT with $CIPHER |
| **Monthly Fuel** | Pay for bot operation |
| **Indicator Access** | Hold tokens to unlock PriceCipher indicator |
| **Strategy Access** | Higher tiers unlock more strategies |
| **Rewards** | Receive bot performance rewards |
| **Governance** | Future voting rights |

### Dual Utility Model

$CIPHER serves two distinct user groups:

**For NFT Holders (Bot Owners):**
- Pay for NFT mint
- Pay monthly fuel
- Receive rewards when bot performs

**For Traders (Non-NFT Holders):**
- Hold tokens to access indicator
- Higher holdings = more strategy access
- Trade actively using our tools
- No bot ownership required

### Token Flow

```
                    ┌─────────────────┐
                    │   $CIPHER       │
                    │   Token Pool    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ↓                             ↓
        ┌─────────┐                   ┌─────────┐
        │  Mint   │                   │  Fuel   │
        │ Payment │                   │ Payment │
        └─────────┘                   └─────────┘
              │                             │
              └──────────────┬──────────────┘
                             ↓
                    ┌─────────────────┐
                    │    Treasury     │
                    │   & Operations  │
                    └─────────────────┘
                             │
                             ↓
                    ┌─────────────────┐
                    │    Rewards      │
                    │  Distribution   │
                    └─────────────────┘
```

### Why $CIPHER?

1. **Aligned Incentives:** Everyone holds the same token
2. **Deflationary Pressure:** Tokens used for payments
3. **Utility Demand:** Multiple use cases drive demand
4. **Community Ownership:** Token holders benefit from growth

---

## Fuel System

### What is Fuel?

Fuel is the monthly payment required to keep your bot active. It covers:

- Apex Trader Funding account subscription
- Server infrastructure costs
- Bot maintenance and updates

### Fuel Costs

| Item | Estimated Cost | Paid In |
|------|----------------|---------|
| Monthly Fuel | ~$150-200 equivalent | $CIPHER |

### Payment Schedule

- **Due:** 1st of each month
- **Grace Period:** 7 days
- **Reminder:** Dashboard notification + email

### What Happens If You Don't Pay?

```
Day 1: Fuel Due
    ↓
Day 7: Grace Period Ends
    ↓
Day 8: Bot Status → BROKEN 💀
    ↓
Slot Released to Fleet
    ↓
Another User Can Claim Slot
```

---

## Slot Management

### The 20 Slot Limit

Only 20 bots can be active at any time. This creates:

- **Scarcity:** Slots are valuable
- **Accountability:** Pay or lose your slot
- **Liquidity:** Slots cycle when users go inactive

### NFT Ownership vs Active Slot

| Scenario | NFT Owned | Slot Active | Can Trade |
|----------|-----------|-------------|-----------|
| Active User | ✅ | ✅ | ✅ |
| Broken Bot | ✅ | ❌ Released | ❌ |
| Waiting in Queue | ✅ | ❌ Waiting | ❌ |

**Key Point:** You can OWN the NFT but not have an active slot.

### Reactivation Queue

When you want to reactivate a broken bot:

1. Join the waiting queue
2. Wait for a slot to open
3. When your turn comes, pay fuel to activate
4. Bot starts fresh (no back-pay required)

### Queue Priority

```
Slot Opens Up
      │
      ▼
Queue Not Empty? ─── YES ──→ First in Queue Gets Slot
      │
      NO
      │
      ▼
Available for New Mint
```

---

## Rewards Distribution

### When Do Rewards Begin?

Rewards are distributed **only after a bot completes its evaluation** and becomes a funded Performance Account (PA).

### Evaluation Requirements

| Requirement | Target |
|-------------|--------|
| Profit Target | $9,000 |
| Max Drawdown | $5,000 (trailing) |
| Minimum Days | 7 trading days |
| Daily Close | All trades closed by 4:59 PM ET |

### Reward Distribution (Option C: Hybrid)

```
Bot Passes Evaluation
        ↓
Bot Becomes Funded PA
        ↓
Profits Generated from Trading
        ↓
Converted to $CIPHER
        ↓
Deposited to Rewards Contract
        ↓
NFT Holder Claims When Ready
```

### Distribution Split

| Recipient | Share | Purpose |
|-----------|-------|---------|
| NFT Holder | 80% | Reward for ownership |
| Decrypt Labs | 20% | Operations & development |

### Claiming Rewards

- Rewards accumulate in smart contract
- Claim anytime (minimum threshold applies)
- No expiration on unclaimed rewards

---

## Access System

### Two Paths: NFTs vs Tokens

Decrypt Labs offers two distinct access paths:

| Access Type | What You Get | How To Access |
|-------------|--------------|---------------|
| **NFT Holder** | Bot Fleet (gamification) | Mint a Bot NFT |
| **Token Holder** | Indicator + Strategies | Hold $CIPHER tokens |

**Important:** These are SEPARATE access paths.
- NFT holders get bot access, NOT indicator/strategy access
- Token holders get indicator/strategy access, NOT bot access
- Want both? Hold tokens AND own an NFT

---

## Token Holder Tiers

### Tiered Access Based on Holdings

The more $CIPHER you hold, the more tools you unlock:

| Tier | $CIPHER Required | Access Level |
|------|------------------|--------------|
| 🥉 **Bronze** | 100,000 tokens | PriceCipher Indicator only |
| 🥇 **Gold** | 500,000 tokens | Indicator + 1 Strategy |
| 💎 **Diamond** | 1,300,000 tokens | Indicator + All 4 Strategies |

*Thresholds may be adjusted based on market cap changes*

### What Each Tier Unlocks

**🥉 Bronze Tier — Indicator Access (100k $CIPHER)**
- PriceCipher TradingView Indicator
- ICT concept visualization
- Kill zone highlighting
- Basic alerts

**🥇 Gold Tier — Indicator + 1 Strategy (500k $CIPHER)**
- Everything in Bronze
- Access to 1 strategy of your choice
- Strategy guide and setup alerts

**💎 Diamond Tier — Full Suite (1.3M $CIPHER)**
- Everything in Gold
- All 4 strategies unlocked
- Priority Discord support
- Early access to new strategies
- Strategy development input
- Exclusive holder calls

### How Verification Works

1. Connect wallet to our verification system
2. System checks $CIPHER token balance
3. Tier assigned based on holdings
4. Access granted to TradingView indicators
5. Balance re-checked periodically
6. Tier adjusts if balance changes

---

## NFT Holder Access

### Bot Fleet Only

NFT holders get access to the **Bot Fleet gamification system**:

| What NFT Holders Get | What NFT Holders DON'T Get |
|----------------------|---------------------------|
| ✅ Bot slot ownership | ❌ TradingView indicator |
| ✅ Strategy selection for bot | ❌ Strategy guides |
| ✅ Dashboard tracking | ❌ Direct trading tools |
| ✅ Token rewards (when bot performs) | ❌ Tier benefits |
| ✅ Community access | |

**NFT = Passive participation through bots**
**Tokens = Active trading with our tools**

---

## Technical Architecture

### Blockchain: Base

All Decrypt Labs smart contracts and tokens are deployed on **Base** (Coinbase L2):

| Why Base? | Benefit |
|-----------|---------|
| Low gas fees | Affordable transactions for all users |
| Coinbase ecosystem | Trusted infrastructure |
| EVM compatible | Standard Ethereum tooling |
| Growing adoption | Active DeFi and NFT community |

### Token Launch: Virtuals Protocol

$CIPHER launches via **Virtuals Protocol** (virtuals.io):

| Virtuals Benefit | Description |
|------------------|-------------|
| AI Agent Framework | Native support for AI-powered projects |
| Fair Launch | Transparent token distribution |
| Base Native | Built on Base chain |
| Community Focused | Aligned with our values |

### Smart Contracts

| Contract | Purpose | Chain |
|----------|---------|-------|
| $CIPHER Token | ERC-20 via Virtuals | Base |
| BotNFT.sol | ERC-721 NFT minting | Base |
| BotFleet.sol | Slot management | Base |
| FuelManager.sol | Monthly payment tracking | Base |
| RewardsDistributor.sol | Distribution & claims | Base |
| TierGate.sol | Token holder verification | Base |

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Landing    │  │  Dashboard  │  │  Mint Page  │     │
│  │  Page       │  │             │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN LAYER                     │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐  │
│    │ BotNFT  │  │  Fleet  │  │  Fuel   │  │ Rewards│  │
│    └─────────┘  └─────────┘  └─────────┘  └────────┘  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Railway    │  │  TradersPost│  │   Apex      │     │
│  │  API        │  │  Webhooks   │  │   Accounts  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Security Measures

- Smart contracts audited before launch
- Multi-sig treasury wallet
- Rate limiting on API endpoints
- Encrypted webhook communications

---

## Roadmap

### Phase 1: Foundation ✅
- [x] Bot development (OTE Silver Bullet, FVG+IFVG, OTE Refined)
- [x] Dashboard creation
- [x] Backtesting (9,900+ trades)
- [x] Initial bot deployment
- [x] Whitepaper release

### Phase 2: Token Launch (Virtuals) 🔄
- [ ] $CIPHER token launch on Virtuals Protocol
- [ ] Base chain deployment
- [ ] Initial liquidity
- [ ] Community building
- [ ] Token holder tier system activation

### Phase 3: NFT Launch 📋
- [ ] Bot NFT smart contract (Base)
- [ ] Fleet & Fuel contracts
- [ ] Security audit
- [ ] NFT mint event (20 bots)
- [ ] Bot fleet activation

### Phase 4: Expansion 🚀
- [ ] TradingView indicator integration
- [ ] Strategy guide releases
- [ ] Additional bot strategies
- [ ] Mobile dashboard
- [ ] Partnership integrations

---

## Risk Disclosure

### Important Disclaimers

**Trading Risk:** Algorithmic trading involves substantial risk. Past performance does not guarantee future results. Bots can and do lose money.

**No Guarantees:** Decrypt Labs makes no guarantees about bot performance, token rewards, or investment returns.

**Not Financial Advice:** Nothing in this whitepaper constitutes financial, investment, or trading advice. Always do your own research.

**Regulatory Risk:** Cryptocurrency and token regulations vary by jurisdiction. Users are responsible for compliance with local laws.

**Smart Contract Risk:** While contracts will be audited, bugs can exist. Users interact with contracts at their own risk.

**Market Risk:** Cryptocurrency markets are volatile. $CIPHER token value can fluctuate significantly.

### User Responsibilities

- Understand the risks before participating
- Only use funds you can afford to lose
- Maintain your own tax records
- Comply with your local regulations
- Keep your wallet secure

---

## Conclusion

Decrypt Labs is building the future of democratized algorithmic trading. Through our Bot Fleet NFT system, anyone can own a piece of our trading infrastructure and participate in the $CIPHER ecosystem.

**Join the Fleet. Trade the Future.**

---

## Links & Resources

- **Website:** [decryptlabs.io](https://decryptlabs.io)
- **Dashboard:** [decryptlabs.io/dashboard](https://decryptlabs.io/dashboard)
- **Twitter:** [@PriceCipherHQ](https://twitter.com/PriceCipherHQ)
- **Discord:** [Coming Soon]

---

*© 2026 Decrypt Labs. All rights reserved.*
