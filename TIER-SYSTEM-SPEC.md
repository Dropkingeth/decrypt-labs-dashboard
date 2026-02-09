# Tier System Spec — Token Holder Access

## Overview
Token holders get access to TradingView indicators/strategies based on their $CIPHER holdings.

---

## User Flow (Laboratory Page)

1. **Connect Wallet** → Detect $CIPHER balance
2. **Show Tier** → Based on holdings (see tiers below)
3. **Input TradingView Username** → Text field
4. **Select Access Type** → Based on tier:
   - Lower tiers: Indicator only
   - Higher tiers: Full strategy access
5. **Submit** → Sends to Caretaker API
6. **Confirmation** → "You'll be added within 24 hours"

---

## Tier Structure (3 Tiers)

| Tier | $CIPHER | Access |
|------|---------|--------|
| 🥉 **Bronze** | 15,000+ | Indicator only |
| 🥈 **Silver** | 30,000+ | Indicator + 1 Strategy (pick one) |
| 🥇 **Gold** | 50,000+ | Everything (Indicator + All Strategies) |

---

## TradingView Products

**Indicator:**
- HTF-ICT-Arrays

**Strategies (4):**
- IFVG+FVG
- Silver-Bullet
- OTE-High
- OTE-Low

---

## Access by Tier

| Tier | HTF-ICT-Arrays | IFVG+FVG | Silver-Bullet | OTE-High | OTE-Low |
|------|----------------|----------|---------------|----------|---------|
| 🥉 Bronze | ✅ | ❌ | ❌ | ❌ | ❌ |
| 🥈 Silver | ✅ | Pick 1 | Pick 1 | Pick 1 | Pick 1 |
| 🥇 Gold | ✅ | ✅ | ✅ | ✅ | ✅ |

**Note:** NFT holders get Bot access only (not TradingView scripts)

---

## Data to Collect

```json
{
  "wallet": "0x...",
  "tradingViewUsername": "DropkingICT",
  "cipherBalance": 5000,
  "tier": "diamond",
  "selectedStrategies": ["OTE Silver Bullet", "FVG+IFVG"],
  "timestamp": "2026-02-03T..."
}
```

---

## API Endpoint (Caretaker)

**POST /api/tradingview-access**
- Receives user submissions
- Stores in database/file
- Sends notification to admin (optional)

**GET /api/tradingview-access** (admin only)
- Lists all pending/approved users
- Shows tier, username, strategies requested

---

## Admin Dashboard (Caretaker)

Add section showing:
- List of users requesting access
- Their TradingView username
- Their tier & eligible strategies
- Approve/Deny buttons
- Status: Pending / Added / Denied

---

## Questions for DropKing

1. **Confirm tier thresholds** — What $CIPHER amounts for each tier?
2. **NFT holders** — Do NFT holders get automatic access regardless of $CIPHER?
3. **Indicator vs Strategy** — What's the difference in TradingView access?
4. **Manual add process** — How do you add users on TradingView? (invite system?)
5. **Expiration** — Does access expire if they sell tokens?

---

## Implementation Order

1. [ ] Add tier detection to Laboratory
2. [ ] Add TradingView username input form
3. [ ] Add strategy/indicator selection based on tier
4. [ ] Create POST /api/tradingview-access endpoint
5. [ ] Create admin view in Caretaker dashboard
6. [ ] Add notification when new user submits

---

*Created: 2026-02-03*
