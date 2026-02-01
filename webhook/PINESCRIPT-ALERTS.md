# PineScript Alert Integration

Add these alert messages to your TradingView strategies to send trade data to the webhook.

---

## 🔷 OTE Silver Bullet

### Variables to Add (top of script):

```pinescript
// ============================================================
// WEBHOOK ALERT MESSAGES - Decrypt Labs Integration
// ============================================================

// Format JSON for entry alerts
getEntryAlert(side) =>
    '{"bot":"ote-silver-bullet","action":"entry","side":"' + side + '","symbol":"{{ticker}}","price":{{close}},"entryPrice":{{close}},"size":' + str.tostring(math.abs(strategy.position_size)) + ',"time":"{{time}}","timeframe":"{{interval}}"}'

// Format JSON for exit alerts
getExitAlert(side, exitType, pnl) =>
    '{"bot":"ote-silver-bullet","action":"' + exitType + '","side":"' + side + '","symbol":"{{ticker}}","price":{{close}},"exitPrice":{{close}},"entryPrice":' + str.tostring(strategy.position_avg_price) + ',"size":' + str.tostring(math.abs(strategy.position_size)) + ',"pnl":' + str.tostring(pnl) + ',"totalPnl":' + str.tostring(strategy.netprofit) + ',"time":"{{time}}","timeframe":"{{interval}}"}'
```

### Alert Triggers (add to your entry/exit logic):

```pinescript
// ============================================================
// ENTRY ALERTS
// ============================================================

// Long Entry
if (longEntryCondition)
    strategy.entry("Long", strategy.long)
    alert(getEntryAlert("long"), alert.freq_once_per_bar)

// Short Entry  
if (shortEntryCondition)
    strategy.entry("Short", strategy.short)
    alert(getEntryAlert("short"), alert.freq_once_per_bar)

// ============================================================
// EXIT ALERTS
// ============================================================

// TP1 Hit
if (tp1Condition)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "tp1", currentPnl), alert.freq_once_per_bar)

// TP2 Hit
if (tp2Condition)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "tp2", currentPnl), alert.freq_once_per_bar)

// Stop Loss Hit
if (slCondition)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "sl", currentPnl), alert.freq_once_per_bar)

// Runner Exit
if (runnerExitCondition)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "runner", currentPnl), alert.freq_once_per_bar)

// EOD Flatten
if (eodFlattenCondition)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "eod", currentPnl), alert.freq_once_per_bar)

// Bias Flip Exit
if (biasFlipCondition)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "bias_flip", currentPnl), alert.freq_once_per_bar)
```

---

## 🟢 FVG+IFVG (Determining Order Flow)

### Variables to Add (top of script):

```pinescript
// ============================================================
// WEBHOOK ALERT MESSAGES - Decrypt Labs Integration
// ============================================================

// Format JSON for entry alerts
getEntryAlert(side) =>
    '{"bot":"fvg-ifvg","action":"entry","side":"' + side + '","symbol":"{{ticker}}","price":{{close}},"entryPrice":{{close}},"size":' + str.tostring(math.abs(strategy.position_size)) + ',"time":"{{time}}","timeframe":"{{interval}}"}'

// Format JSON for exit alerts  
getExitAlert(side, exitType, pnl) =>
    '{"bot":"fvg-ifvg","action":"' + exitType + '","side":"' + side + '","symbol":"{{ticker}}","price":{{close}},"exitPrice":{{close}},"entryPrice":' + str.tostring(strategy.position_avg_price) + ',"size":' + str.tostring(math.abs(strategy.position_size)) + ',"pnl":' + str.tostring(pnl) + ',"totalPnl":' + str.tostring(strategy.netprofit) + ',"time":"{{time}}","timeframe":"{{interval}}"}'
```

### Alert Triggers:

```pinescript
// ============================================================
// ENTRY ALERTS
// ============================================================

// Long Entry
if (longEntryCondition)
    strategy.entry("Long", strategy.long)
    alert(getEntryAlert("long"), alert.freq_once_per_bar)

// Short Entry
if (shortEntryCondition)
    strategy.entry("Short", strategy.short)
    alert(getEntryAlert("short"), alert.freq_once_per_bar)

// ============================================================
// EXIT ALERTS
// ============================================================

// TP1 Hit
if (tp1Hit)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "tp1", currentPnl), alert.freq_once_per_bar)

// TP2 Hit
if (tp2Hit)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "tp2", currentPnl), alert.freq_once_per_bar)

// TP3 Hit
if (tp3Hit)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "tp3", currentPnl), alert.freq_once_per_bar)

// Stop Loss
if (slHit)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "sl", currentPnl), alert.freq_once_per_bar)

// Bias Flip Exit
if (biasFlipExit)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "bias_flip", currentPnl), alert.freq_once_per_bar)

// EOD Close
if (eodClose)
    currentPnl = (close - strategy.position_avg_price) * strategy.position_size * syminfo.pointvalue
    alert(getExitAlert(strategy.position_size > 0 ? "long" : "short", "eod", currentPnl), alert.freq_once_per_bar)
```

---

## 📡 TradingView Alert Setup

1. **Create Alert** on the chart with the strategy
2. **Condition:** Select your strategy
3. **Webhook URL:** `https://YOUR-NGROK-URL.ngrok.io/webhook/ote-silver-bullet`
   - Or `/webhook/fvg-ifvg` for the FVG strategy
4. **Message:** Leave empty (strategy sends its own message via `alert()`)

---

## 📊 Sample Alert Payloads

### Entry:
```json
{
  "bot": "ote-silver-bullet",
  "action": "entry",
  "side": "long",
  "symbol": "MNQH2026",
  "price": 26150.25,
  "entryPrice": 26150.25,
  "size": 4,
  "time": "2026-01-29T09:55:00Z",
  "timeframe": "30S"
}
```

### Exit (TP1):
```json
{
  "bot": "ote-silver-bullet",
  "action": "tp1",
  "side": "long",
  "symbol": "MNQH2026",
  "price": 26175.50,
  "exitPrice": 26175.50,
  "entryPrice": 26150.25,
  "size": 4,
  "pnl": 202.00,
  "totalPnl": 3205.76,
  "time": "2026-01-29T10:05:00Z",
  "timeframe": "30S"
}
```

### Exit (Stop Loss):
```json
{
  "bot": "fvg-ifvg",
  "action": "sl",
  "side": "short",
  "symbol": "MNQH2026",
  "price": 26180.00,
  "exitPrice": 26180.00,
  "entryPrice": 26150.00,
  "size": 2,
  "pnl": -120.00,
  "totalPnl": 304.06,
  "time": "2026-01-29T10:15:00Z",
  "timeframe": "1"
}
```

---

## 🔧 Testing

Test your webhook with curl:

```bash
curl -X POST http://localhost:3456/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"bot":"ote-silver-bullet","action":"entry","side":"long","symbol":"MNQH2026","price":26150.25,"size":4,"time":"2026-01-29T10:00:00Z"}'
```

---

## ✅ Checklist

- [ ] Copy strategy to new "Webhook" version
- [ ] Add alert functions to top of script
- [ ] Add alert() calls to entry/exit logic
- [ ] Start webhook server: `node server.js`
- [ ] Start ngrok: `ngrok http 3456`
- [ ] Create TradingView alert with webhook URL
- [ ] Test with a manual alert
