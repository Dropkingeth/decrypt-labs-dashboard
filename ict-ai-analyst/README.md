# ICT AI Trading Analyst

Real-time ICT (Inner Circle Trader) market analysis pipeline. Receives webhook alerts from TradingView, captures chart screenshots, feeds data + visuals to Claude AI, and delivers analysis to Discord/Telegram.

## Architecture

```
TradingView Alert → Webhook Receiver → Screenshot Engine → AI Analysis → Discord/Telegram
```

## Quick Start

### 1. Install Dependencies

```bash
cd ict-ai-analyst
pip install -r requirements.txt
playwright install chromium
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required credentials:
- `ANTHROPIC_API_KEY` - Claude API key for analysis
- `DISCORD_WEBHOOK_URL` and/or `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` for delivery
- `TV_USERNAME`, `TV_PASSWORD`, `TV_CHART_URL` for chart screenshots (optional)

### 3. Run the Server

```bash
python main.py
```

Server starts at `http://localhost:8000`

### 4. Test the Webhook

```bash
curl -X POST http://localhost:8000/webhook/test \
  -H "Content-Type: application/json" \
  -d @tests/sample_payload.json
```

### 5. Configure TradingView

1. In your ICT indicator settings, enable "AI Data Export"
2. Create an alert: Condition → "Any alert() function call"
3. Set Webhook URL to your server (use ngrok for local testing)
4. Message field: leave default (indicator outputs JSON automatically)

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info and available endpoints |
| `/health` | GET | Health check |
| `/webhook` | POST | Receive TradingView alerts (triggers full pipeline) |
| `/webhook/test` | POST | Validate payload without triggering pipeline |

## Project Structure

```
ict-ai-analyst/
├── main.py                 # FastAPI server entry point
├── config.py               # Configuration loader
├── webhook/
│   ├── receiver.py         # Webhook endpoint + validation
│   └── models.py           # Pydantic models for JSON payload
├── screenshot/
│   └── capture.py          # Playwright screenshot engine
├── analysis/
│   ├── engine.py           # AI analysis orchestrator
│   └── prompts.py          # ICT system prompt
├── delivery/
│   ├── discord_bot.py      # Discord webhook delivery
│   └── telegram_bot.py     # Telegram bot delivery
├── utils/
│   └── logger.py           # Structured logging
└── tests/
    ├── test_webhook.py     # Webhook tests
    ├── test_analysis.py    # Analysis tests
    └── sample_payload.json # Test payload
```

## Alert Trigger Types

| Trigger | Meaning | Urgency |
|---------|---------|---------|
| `PRE_MARKET_0915` | Pre-market briefing | Low |
| `PRE_OPEN_0929` | 1 min before open | Medium |
| `KZ_OPEN_LONDON` | London Kill Zone opened | Medium |
| `KZ_OPEN_NY_AM` | NY AM Kill Zone opened | High |
| `KZ_OPEN_NY_PM` | NY PM Kill Zone opened | Medium |
| `CONVICTION_CROSSED` | Narrative became Active | High |
| `SETUP_FORMING` | Smart Entry + Active Narrative + KZ | Critical |

## ICT Models

| Model | Description |
|-------|-------------|
| `UNICORN` | Breaker Block + FVG overlap |
| `2022_MODEL` | Sweep → MSS → FVG in correct P/D |
| `SILVER_BULLET` | FVG during Silver Bullet windows |
| `JUDAS_SWING` | False move + sweep + reversal |
| `TURTLE_SOUP` | Liquidity pool raid + MSS |
| `STANDARD_OTE` | MSS + entry in OTE zone |
| `PO3_ENTRY` | Power of 3 distribution |
| `GENERIC` | Entry found, no specific model |

## Deployment

### Local with ngrok

```bash
# Terminal 1
python main.py

# Terminal 2
ngrok http 8000
```

Use the ngrok URL in TradingView webhook settings.

### Docker

```bash
docker build -t ict-analyst .
docker run -p 8000:8000 --env-file .env ict-analyst
```

## Testing

```bash
# Run all tests
pytest tests/ -v

# Test specific module
pytest tests/test_webhook.py -v
pytest tests/test_analysis.py -v
```

## License

MIT
