# TradingView Bot Controls — Jimmy's Control System

*Last updated: February 3, 2026 — **FULLY OPERATIONAL** ✅*

---

## 🎮 Commands

| Command | Action |
|---------|--------|
| **"Jimmy pause OTE"** | Stop OTE Silver Bullet trading |
| **"Jimmy pause FVG"** | Stop FVG+IFVG trading |
| **"Jimmy pause all"** | Emergency stop ALL trading |
| **"Jimmy resume OTE"** | Restart OTE trading |
| **"Jimmy resume FVG"** | Restart FVG trading |
| **"Jimmy bot status"** | Check current status |

---

## 📋 Alert Organization

### 🎯 TRADING ALERTS (These Execute Trades!)

#### OTE Silver Bullet (30s timeframe)
| Alert | Purpose |
|-------|---------|
| **{{message}}** (30s) | Main OTE Silver Bullet strategy |
| **{{strategy.order.alert_message}}** (30s) #1 | High Risk strategy |
| **{{strategy.order.alert_message}}** (30s) #2 | Low Risk strategy |

#### FVG+IFVG (1m timeframe)
| Alert | Purpose |
|-------|---------|
| **{{message}}** (1m) | Inversion Fair Value Gap strategy |

---

### 📊 DASHBOARD ALERTS (Display Only — No Trading)

These go to the Caretaker API for the Decrypt Labs dashboard:

| Alert | Bot | Webhook |
|-------|-----|---------|
| [Silver-Bullet] - Webhook | OTE | /webhook/ote-silver-bullet |
| [Refined-Small] - Webhook | OTE | (display) |
| [Refined-Large] - Webhook | OTE | (display) |
| [FVG+IFVG] - Webhook | FVG | /webhook/fvg-ifvg |

---

### ⏸️ STOPPED ALERTS (Not in Use)

| Alert | Notes |
|-------|-------|
| Optimal Trade Entry [Silver-Bullet] | Stopped manually |
| Determining Order Flow [FVG+IFVG] | Stopped manually |

---

## 🔧 What to Pause/Resume

### To Stop OTE Silver Bullet Trading:
Pause these alerts:
- {{message}} (30s)
- {{strategy.order.alert_message}} #1 (30s) — High Risk
- {{strategy.order.alert_message}} #2 (30s) — Low Risk

### To Stop FVG+IFVG Trading:
Pause this alert:
- {{message}} (1m)

### Dashboard alerts can stay running — they just log signals, no trades.

---

## 🔌 Browser Session

- **Profile:** openclaw
- **URL:** https://www.tradingview.com/chart/aEspKR62/
- **Layout:** cYpTo
- **Account:** DropkingICT

---

## 📝 Control Flow

```
1. Open TradingView in browser
2. Click on alert row → reveals Pause/Restart buttons
3. Click Pause to stop, Restart to resume
4. Verify status change
```

---

## ⚠️ RISK MANAGEMENT RULES

### PM Session Rule (IMPORTANT!)
**When bots are green, PAUSE before PM session (12:00-4:00 PM ET / 9:00 AM-1:00 PM PT)**

- PM session is choppy and prone to reversals
- Lock in gains by pausing when profitable
- Better to miss potential gains than give back profits
- **Lesson learned: 2026-02-03** — gave back gains in PM session

### Daily Risk Protocol
1. Morning check: Review overnight P&L
2. If green before PM: Consider pausing to protect gains
3. EOD (3:55 PM ET): Always pause all trading alerts
4. Never leave alerts running overnight without macro window coverage

---

## 🚨 Emergency Shutdown

If something goes wrong:
1. **"Jimmy pause all"** — Stops all trading alerts
2. Dashboard alerts keep logging (for record)
3. Can also manually flatten positions on Tradovate
