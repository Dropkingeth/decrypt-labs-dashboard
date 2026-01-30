# 🌉 Tradovate Bridge

**Direct TradingView → Tradovate order execution. No TradersPost required!**

## Features

- ✅ Direct API connection to Tradovate
- ✅ Supports Market, Limit, and Stop orders
- ✅ Multi-account support (route different bots to different accounts)
- ✅ Built-in risk management (daily limits, position limits)
- ✅ Order logging
- ✅ Status dashboard

## Quick Start

### 1. Install dependencies
```bash
cd tradovate-bridge
npm install
```

### 2. Configure credentials

Copy the config template:
```bash
cp config.js config.local.js
```

Edit `config.local.js` with your Tradovate credentials:
```javascript
module.exports = {
  // ... keep existing structure ...
  
  tradovate: {
    env: 'demo',  // or 'live' for real trading
    credentials: {
      username: 'YOUR_USERNAME',
      password: 'YOUR_PASSWORD',
      appId: 'DecryptLabs',
      appVersion: '1.0.0',
      cid: 'YOUR_CLIENT_ID',      // From Tradovate API portal
      sec: 'YOUR_CLIENT_SECRET'   // From Tradovate API portal
    }
  },
  
  accounts: {
    'ote-silver-bullet': {
      accountId: 12345,           // Your Tradovate account ID
      accountSpec: 'APEX-12345',  // Your account spec
      maxPosition: 12
    },
    // ... other bots ...
  }
};
```

### 3. Get Tradovate API credentials

1. Go to [Tradovate Trader](https://trader.tradovate.com)
2. Navigate to Settings → API Access
3. Create a new API key
4. Copy the Client ID and Secret

### 4. Start the server
```bash
npm start
```

### 5. Authenticate
```bash
curl -X POST http://localhost:3457/auth
```

### 6. Update TradingView alerts

Change your webhook URL from TradersPost to:
```
http://YOUR_NGROK_URL/webhook/ote-silver-bullet
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Status dashboard |
| GET | `/health` | Health check |
| POST | `/auth` | Authenticate with Tradovate |
| GET | `/positions` | Get all positions |
| POST | `/webhook/{bot}` | Receive TradingView alerts |

## Webhook Format

The server accepts the same JSON format as our existing strategies:

```json
{
  "ticker": "MNQ",
  "action": "buy",
  "sentiment": "bullish",
  "quantity": 5,
  "orderType": "limit",
  "limitPrice": 21432.50
}
```

### Supported Actions:
- `buy` / `sell` — Entry orders
- `exit` — Flatten position
- `cancel` — Cancel pending orders

### Order Types:
- `market` — Market order (default)
- `limit` — Limit order (requires `limitPrice`)
- `stop` — Stop order (requires `stopPrice`)

## Risk Management

Built-in safety features:

- **Max Daily Trades:** Stop trading after X trades per day
- **Max Daily Loss:** Stop trading if P&L drops below threshold
- **Position Limits:** Cap maximum contracts per bot
- **Order Logging:** All orders logged to `logs/orders.jsonl`

## Architecture

```
TradingView Alert
       ↓
  [Webhook Server]
       ↓
  [Order Router]    →  Risk Check
       ↓                   ↓
[Tradovate Client]    [Reject if exceeded]
       ↓
  [Tradovate API]
       ↓
  [Apex Account]
```

## Logs

Orders are logged to `logs/orders.jsonl`:

```json
{"type":"webhook","bot":"ote-silver-bullet","alert":{...},"timestamp":"..."}
{"type":"result","bot":"ote-silver-bullet","result":{...},"timestamp":"..."}
```

## Troubleshooting

### "Not authenticated"
- Run `curl -X POST http://localhost:3457/auth`
- Check credentials in `config.local.js`

### "Unknown symbol"
- Update the `symbols` mapping in config
- Use full contract symbol (e.g., `MNQH5`)

### "Risk limits exceeded"
- Check `dailyStats` at `/health`
- Reset by restarting server (or wait for new day)

## Next Steps

- [ ] Add WebSocket connection for real-time updates
- [ ] Implement order tracking (match fills to entries)
- [ ] Add position monitoring
- [ ] Build notification system (Telegram/Discord alerts)

---

*Built by Decrypt Labs 🧪*
