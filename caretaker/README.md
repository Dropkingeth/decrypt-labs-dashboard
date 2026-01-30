# 🤖 Trade Caretaker

**Automated trade monitoring and recovery system.**

## What It Does

1. **Monitors all incoming alerts** from your TradingView strategies
2. **Tracks expected positions** based on the signals
3. **Verifies actual positions** via Tradovate browser check
4. **Retries failed orders** via TradersPost webhook
5. **Alerts you** when something needs attention

## How It Works

```
TradingView Alert
      ↓
Webhook Server → Caretaker logs "Expecting LONG 5 MNQ"
      ↓
TradersPost → Tradovate
      ↓
[30 seconds later]
      ↓
Caretaker checks Tradovate (via browser)
      ↓
Position matches? ✅ Mark verified
Position wrong?   🔄 Retry via TradersPost
Still wrong?      🚨 Alert DropKing
```

## Schedule

- **Active:** Monday - Friday
- **Sessions:** 
  - NY AM: 9:45 AM - 11:00 AM ET
  - NY PM: 1:45 PM - 4:00 PM ET
- **EOD Check:** 4:00 PM ET (ensure all flat)

## Setup

1. **Configure TradersPost webhook:**
   ```bash
   cp config.js config.local.js
   # Edit config.local.js with your webhook URL
   ```

2. **Attach Tradovate browser tab:**
   - Open Tradovate in Chrome
   - Click the Clawdbot Browser Relay toolbar button
   - Jimmy can now see your positions

3. **Integration:**
   - Caretaker is automatically called when webhooks arrive
   - Position checks run every 60 seconds during sessions

## Discrepancy Types

| Type | Severity | Action |
|------|----------|--------|
| `missing_position` | High | Order didn't fill - retry |
| `wrong_direction` | Critical | Wrong side - ALERT IMMEDIATELY |
| `size_mismatch` | Medium | Partial fill - may retry remainder |

## Logs

All activity logged to `logs/caretaker.jsonl`:
```json
{"event":"alert_received","bot":"ote-refined","alert":{...},"timestamp":"..."}
{"event":"retry_sent","order":"ote-refined-123","attempt":1,"timestamp":"..."}
{"event":"position_verified","bot":"ote-refined","symbol":"MNQ","timestamp":"..."}
```

## Manual Controls

Jimmy can:
- Check position status anytime
- Force retry an order
- Flatten a position in emergency
- Skip monitoring temporarily

---

*Your bots' guardian angel 🤖*
