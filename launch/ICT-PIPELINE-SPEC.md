# ICT AI Trading Analyst — Full Build Prompt

> **What this is:** A complete, self-contained prompt for an AI assistant to build a real-time ICT (Inner Circle Trader) market analysis pipeline. This system receives webhook alerts from a TradingView indicator, captures chart screenshots, feeds both data + visuals to an AI model, and delivers pre-market analysis to the user via Discord or Telegram.
>
> **What you (the AI) are building:** A Python server with 4 components: webhook receiver, screenshot engine, AI analysis engine, and delivery bot.

---

## SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────┐
│  TRADINGVIEW (already built — not your concern)          │
│                                                          │
│  ICT Smart Entry indicator fires alert() with JSON       │
│  TradingView sends webhook POST to your server           │
└────────────────────────┬─────────────────────────────────┘
                         │ POST /webhook
                         ▼
┌──────────────────────────────────────────────────────────┐
│  YOUR SERVER (Python — this is what you're building)     │
│                                                          │
│  Component 1: WEBHOOK RECEIVER (FastAPI)                 │
│    → Receives JSON from TradingView                      │
│    → Validates payload, logs it                          │
│    → Triggers the pipeline                               │
│                                                          │
│  Component 2: SCREENSHOT ENGINE (Playwright)             │
│    → Authenticates to TradingView                        │
│    → Navigates to the user's chart                       │
│    → Waits for indicator to render                       │
│    → Captures high-res screenshot                        │
│                                                          │
│  Component 3: AI ANALYSIS ENGINE (Anthropic API)         │
│    → Sends JSON data + screenshot to Claude              │
│    → Uses ICT-specific system prompt                     │
│    → Returns structured market breakdown                 │
│                                                          │
│  Component 4: DELIVERY BOT (Discord + Telegram)          │
│    → Formats analysis with screenshot                    │
│    → Sends to user's channel/chat                        │
│    → Includes entry model, levels, confidence            │
└──────────────────────────────────────────────────────────┘
```

---

## PROJECT STRUCTURE

Create this exact directory structure:

```
ict-ai-analyst/
├── .env                      # Secrets (API keys, tokens, URLs)
├── .env.example              # Template for .env
├── requirements.txt          # Python dependencies
├── config.py                 # Configuration loader
├── main.py                   # FastAPI server entry point
├── webhook/
│   ├── __init__.py
│   ├── receiver.py           # Webhook endpoint + validation
│   └── models.py             # Pydantic models for JSON payload
├── screenshot/
│   ├── __init__.py
│   └── capture.py            # Playwright screenshot engine
├── analysis/
│   ├── __init__.py
│   ├── engine.py             # AI analysis orchestrator
│   └── prompts.py            # ICT system prompt + formatting
├── delivery/
│   ├── __init__.py
│   ├── discord_bot.py        # Discord webhook delivery
│   └── telegram_bot.py       # Telegram bot delivery
├── utils/
│   ├── __init__.py
│   └── logger.py             # Structured logging
└── tests/
    ├── test_webhook.py
    ├── test_analysis.py
    └── sample_payload.json   # Test payload for development
```

---

## DEPENDENCIES (requirements.txt)

```
fastapi==0.115.0
uvicorn==0.30.0
pydantic==2.9.0
python-dotenv==1.0.1
anthropic==0.40.0
playwright==1.48.0
aiohttp==3.10.0
httpx==0.27.0
Pillow==10.4.0
structlog==24.4.0
```

After install, run: `playwright install chromium`

---

## ENVIRONMENT VARIABLES (.env)

```env
# Server
HOST=0.0.0.0
PORT=8000
WEBHOOK_SECRET=your_random_secret_here

# TradingView (for screenshot capture)
TV_USERNAME=your_tradingview_username
TV_PASSWORD=your_tradingview_password
TV_CHART_URL=https://www.tradingview.com/chart/YOUR_CHART_ID/

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# Discord (webhook-based, no bot token needed)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Delivery preference
DELIVERY_METHOD=discord  # "discord", "telegram", or "both"
```

---

## COMPONENT 1: WEBHOOK RECEIVER

### Pydantic Models (webhook/models.py)

These models match the EXACT JSON schema that the TradingView indicator produces. Do not modify the field names — they must match the indicator's output.

```python
from pydantic import BaseModel, Field
from typing import Optional

class BiasData(BaseModel):
    dir: str                    # "BULL" or "BEAR"
    dol: Optional[float]        # Draw on Liquidity price
    dol_src: str                # "PDH", "PDL", "BSL x3", "SSL x2", "IPDA 20D High", etc.
    dol_status: str             # "ACTIVE", "DELIVERED", "SEEKING"
    reason: str                 # "ASIA_SWEEP", "MSS", "PD_ZONE"

class StructureData(BaseModel):
    mss: str                    # "BULL", "BEAR", "NONE"
    bos_bull: bool              # Break of Structure bullish this bar
    bos_bear: bool              # Break of Structure bearish this bar
    choch_bull: bool            # Change of Character bullish (MSS up)
    choch_bear: bool            # Change of Character bearish (MSS down)
    displaced: bool             # Displacement candle (large body, small wicks)

class LevelsData(BaseModel):
    pdh: Optional[float]        # Previous Day High
    pdl: Optional[float]        # Previous Day Low
    asia_h: Optional[float]     # Asia session range high
    asia_l: Optional[float]     # Asia session range low
    asia_swept_h: bool          # Asia high was swept (liquidity taken)
    asia_swept_l: bool          # Asia low was swept (liquidity taken)
    eq: Optional[float]         # Equilibrium (midpoint of dealing range)
    premium: Optional[float]    # Premium zone boundary (upper 25%)
    discount: Optional[float]   # Discount zone boundary (lower 25%)
    deal_h: Optional[float]     # Dealing range high (HTF highest)
    deal_l: Optional[float]     # Dealing range low (HTF lowest)
    ote_h: Optional[float]      # OTE zone high (79% retrace)
    ote_l: Optional[float]      # OTE zone low (62% retrace)
    ipda20h: Optional[float]    # IPDA 20-day high
    ipda20l: Optional[float]    # IPDA 20-day low
    ipda40h: Optional[float]    # IPDA 40-day high
    ipda40l: Optional[float]    # IPDA 40-day low
    ipda60h: Optional[float]    # IPDA 60-day high
    ipda60l: Optional[float]    # IPDA 60-day low

class NarrativeData(BaseModel):
    state: str                  # "NONE", "DEVELOPING", "ACTIVE"
    dir: str                    # "BULL", "BEAR", "NONE"
    score: int                  # 0-100 conviction score
    sweep: bool                 # Liquidity sweep confirmed
    mss: bool                   # Market Structure Shift confirmed
    entry: bool                 # Entry array available in correct direction
    pd_aligned: bool            # Entry in correct Premium/Discount zone
    kz: bool                    # Currently in a Kill Zone
    confirm: bool               # Has additional confirmation (RejBlock, VI)

class EntryData(BaseModel):
    found: bool                 # Smart Entry winner found
    type: str                   # "OB", "FVG", "BRK", "IFVG"
    dir: str                    # "BULL", "BEAR"
    px: Optional[float]         # Entry price (mean/CE of winning array)
    top: Optional[float]        # Zone top
    bot: Optional[float]        # Zone bottom
    score: float                # Entry quality score

class ModelData(BaseModel):
    name: str                   # ICT model name (see table below)
    conf: float                 # Model confidence 0.0-1.0
    flags: str                  # Comma-separated: "SB,OTE,DISCOUNT,KZ"

class SessionData(BaseModel):
    kz: str                     # "LONDON", "NY_AM", "NY_PM", "ASIA", "NONE"
    po3: str                    # "ACCUMULATION", "MANIPULATION", "DISTRIBUTION", "UNKNOWN"
    macro: bool                 # In a macro time window
    sb_time: bool               # In a Silver Bullet time window

class TradingViewPayload(BaseModel):
    v: int                      # Schema version (always 1)
    trigger: str                # What triggered this alert
    sym: str                    # Symbol (e.g., "MNQ1!")
    tf: str                     # Timeframe (e.g., "5")
    px: float                   # Current price
    ts: int                     # Timestamp (Unix ms)
    bias: BiasData
    struct: StructureData
    levels: LevelsData
    narr: NarrativeData
    entry: EntryData
    model: ModelData
    session: SessionData
```

### Trigger Types Reference

The `trigger` field tells you WHY the alert fired:

| Trigger | Meaning | Urgency |
|---------|---------|---------|
| `PRE_MARKET_0915` | Pre-market briefing at 9:15 AM NY | Low — informational |
| `PRE_OPEN_0929` | Final snapshot 1 min before open | Medium — levels locked |
| `KZ_OPEN_LONDON` | London Kill Zone just opened | Medium — watch for setups |
| `KZ_OPEN_NY_AM` | NY AM Kill Zone just opened | High — prime trading time |
| `KZ_OPEN_NY_PM` | NY PM Kill Zone just opened | Medium — afternoon session |
| `CONVICTION_CROSSED` | Narrative crossed from Developing → Active | High — setup forming |
| `SETUP_FORMING` | Smart Entry + Active Narrative + Kill Zone | Critical — trade alert |

### ICT Model Names Reference

The `model.name` field identifies which ICT trading model the indicator detected:

| Model Name | What It Is | How ICT Trades It |
|------------|-----------|-------------------|
| `UNICORN` | Breaker Block + FVG overlap zone | High-probability reversal. Entry at the overlap zone, SL below the breaker, TP at the DOL. |
| `2022_MODEL` | Liquidity sweep → MSS → FVG in discount/premium | ICT's primary model. Wait for sweep, confirm MSS, enter at FVG in correct P/D zone. |
| `SILVER_BULLET` | FVG formed during Silver Bullet windows (3-4 AM, 10-11 AM, 2-3 PM NY) | Time-based. FVG forms during SB window, enter at CE of FVG, target previous high/low. |
| `JUDAS_SWING` | False move at KZ open that sweeps liquidity, then reverses | Classic manipulation. Market fakes direction at KZ open, grabs stops, then runs opposite. |
| `TURTLE_SOUP` | Liquidity pool swept + MSS reversal confirmed | Old-school ICT. Equal highs/lows get raided, then MSS confirms the reversal. |
| `STANDARD_OTE` | MSS confirmed + entry in 62-79% Fibonacci retracement zone | Bread and butter. After MSS, price retraces to OTE zone (62-79%), enter with the trend. |
| `PO3_ENTRY` | Distribution phase + Active narrative aligning | Power of 3. Accumulation → Manipulation sweep → Distribution in the intended direction. |
| `GENERIC` | Entry found but no specific model pattern matched | Use with caution. Data points present but no clean model identification. |

### Webhook Endpoint (webhook/receiver.py)

```python
from fastapi import APIRouter, Request, HTTPException
from .models import TradingViewPayload
import structlog

router = APIRouter()
logger = structlog.get_logger()

@router.post("/webhook")
async def receive_webhook(request: Request):
    """
    Receives JSON webhook from TradingView alert.
    TradingView sends the alert message body as the POST body.
    """
    try:
        body = await request.json()
        payload = TradingViewPayload(**body)

        logger.info("webhook_received",
            trigger=payload.trigger,
            symbol=payload.sym,
            model=payload.model.name,
            conviction=payload.narr.score,
            entry_found=payload.entry.found
        )

        # Trigger the analysis pipeline
        # (Import and call your pipeline orchestrator here)
        from analysis.engine import run_analysis_pipeline
        await run_analysis_pipeline(payload)

        return {"status": "ok", "trigger": payload.trigger}

    except Exception as e:
        logger.error("webhook_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
```

---

## COMPONENT 2: SCREENSHOT ENGINE

### How TradingView Screenshots Work

There are two approaches. Pick whichever works for your setup:

#### Option A: Playwright Browser Automation (Full Control)

This logs into TradingView, navigates to the chart, waits for render, and captures a screenshot.

```python
# screenshot/capture.py

import asyncio
from playwright.async_api import async_playwright
from pathlib import Path
import structlog
from config import settings

logger = structlog.get_logger()

class TradingViewScreenshot:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self._authenticated = False

    async def initialize(self):
        """Launch browser and authenticate to TradingView."""
        pw = await async_playwright().start()
        self.browser = await pw.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage']
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            device_scale_factor=2  # Retina-quality screenshots
        )
        self.page = await self.context.new_page()

    async def authenticate(self):
        """Log into TradingView. Call once, session persists."""
        if self._authenticated:
            return

        await self.page.goto('https://www.tradingview.com/accounts/signin/')
        await self.page.wait_for_timeout(2000)

        # Click "Email" sign-in option
        email_buttons = await self.page.query_selector_all('button')
        for btn in email_buttons:
            text = await btn.inner_text()
            if 'Email' in text:
                await btn.click()
                break

        await self.page.wait_for_timeout(1000)

        # Fill credentials
        await self.page.fill('input[name="id_username"]', settings.TV_USERNAME)
        await self.page.fill('input[name="id_password"]', settings.TV_PASSWORD)
        await self.page.click('button[type="submit"]')

        # Wait for login to complete
        await self.page.wait_for_timeout(5000)
        self._authenticated = True
        logger.info("tradingview_authenticated")

    async def capture(self, output_path: str = "chart.png") -> str:
        """
        Navigate to chart and capture screenshot.
        Returns the file path of the saved screenshot.
        """
        if not self._authenticated:
            await self.authenticate()

        # Navigate to chart
        await self.page.goto(settings.TV_CHART_URL)

        # Wait for chart to fully render
        # The indicator needs time to calculate and draw
        await self.page.wait_for_timeout(8000)

        # Wait for the chart canvas to be present
        await self.page.wait_for_selector('canvas', timeout=15000)

        # Additional wait for indicator overlays to render
        await self.page.wait_for_timeout(3000)

        # Hide TradingView UI elements for clean screenshot
        await self.page.evaluate('''
            // Hide header, toolbars, watchlist for clean chart
            document.querySelectorAll(
                '.header-chart-panel, .bottom-widgetbar-content, .tv-side-toolbar'
            ).forEach(el => el.style.display = 'none');
        ''')

        await self.page.wait_for_timeout(500)

        # Capture screenshot
        path = Path(output_path)
        await self.page.screenshot(path=str(path), full_page=False)

        logger.info("screenshot_captured", path=str(path))
        return str(path)

    async def close(self):
        """Clean up browser resources."""
        if self.browser:
            await self.browser.close()


# Singleton instance
_screenshotter = None

async def get_screenshot(output_path: str = "chart.png") -> str:
    """Get a chart screenshot. Initializes browser on first call."""
    global _screenshotter
    if _screenshotter is None:
        _screenshotter = TradingViewScreenshot()
        await _screenshotter.initialize()
    return await _screenshotter.capture(output_path)
```

#### Option B: TradingView Snapshot API (Simpler, Less Control)

TradingView has a snapshot feature. If the user shares their chart, you can fetch the image directly:

```python
# Alternative: Use TradingView's built-in snapshot URL
# If the chart is shared, snapshots are available at:
# https://www.tradingview.com/x/{snapshot_id}/

# You can also use the TV API to request a snapshot
# This requires the chart to be published/shared
```

**Recommendation:** Use Option A (Playwright) for full control over timing and screenshot quality. The browser stays authenticated and can capture on-demand.

#### Screenshot Timing Note

When using `barstate.islast` triggers (which the indicator does), the alert fires on the most recent bar. For a 5-minute chart:
- Pre-Market 9:15 → captures the 9:15 bar's state
- Setup Forming → captures the exact moment the setup is detected

The 8-second wait in the Playwright code gives the indicator time to calculate on the latest bar and render all drawings.

---

## COMPONENT 3: AI ANALYSIS ENGINE

This is the core. The system prompt teaches Claude to think like ICT.

### System Prompt (analysis/prompts.py)

```python
ICT_SYSTEM_PROMPT = """
You are an expert ICT (Inner Circle Trader) market analyst. You analyze futures markets — specifically MNQ (Micro E-mini Nasdaq) — using the ICT methodology exclusively.

You will receive two inputs:
1. A JSON data payload from a TradingView indicator containing all computed ICT data points
2. A screenshot of the current chart with the indicator's visual overlay

Your job is to produce a concise, actionable market breakdown as if you were ICT himself preparing a student for the trading session.

## YOUR ANALYSIS FRAMEWORK

### Step 1: Read the Narrative
Before anything else, determine the story the market is telling:
- Where did price come from? (Previous day's range, overnight action)
- Where is price going? (The Draw on Liquidity — DOL)
- What phase are we in? (Accumulation, Manipulation, Distribution)
- Is there a confirmed Market Structure Shift (MSS)?

### Step 2: Identify the Setup
Using the JSON data, determine:
- Is there a confirmed bias? (DOL direction + reason)
- Has liquidity been swept? (Asia range, PDH/PDL, equal highs/lows)
- Is there a Market Structure Shift confirming the direction?
- Is price in the correct Premium/Discount zone for the bias?
- What ICT model is forming? (The indicator provides this in model.name)

### Step 3: Grade the Entry
If a Smart Entry is found:
- What type of PD array won? (OB, FVG, Breaker, IFVG)
- Is it in the OTE zone? (62-79% of the dealing range retrace)
- What additional confluences exist? (Kill Zone, Macro time, Silver Bullet window)
- What's the model confidence?

### Step 4: Define the Trade
If the setup warrants a trade, provide:
- Entry: The Smart Entry price (from entry.px)
- Stop Loss: Beyond the entry zone (entry.top for shorts, entry.bot for longs) + buffer
- Take Profit: The DOL target (from bias.dol)
- Risk-to-Reward ratio calculation

## ICT TERMINOLOGY REFERENCE

Use these terms correctly:
- **DOL (Draw on Liquidity):** Where price is being drawn to. Could be PDH, PDL, BSL (Buy Side Liquidity), SSL (Sell Side Liquidity), or IPDA levels.
- **MSS (Market Structure Shift):** A Change of Character (CHoCH) — price breaks a swing point against the prior trend, confirming reversal.
- **BOS (Break of Structure):** Price continues the trend by breaking the most recent swing point in trend direction.
- **OB (Order Block):** The last down-candle before a bullish move, or last up-candle before a bearish move. Institutional footprint.
- **FVG (Fair Value Gap):** A 3-candle pattern where the middle candle's body doesn't overlap with the outer candles' wicks. Imbalance zone.
- **IFVG (Inverse FVG):** An FVG that has been completely filled. The filled zone now acts as support/resistance with inverted polarity.
- **Breaker Block:** An OB that failed (got traded through). It now acts as a support/resistance level with inverted polarity.
- **Unicorn:** A Breaker Block that overlaps with an FVG. Extremely high-probability zone.
- **OTE (Optimal Trade Entry):** The 62-79% Fibonacci retracement of the dealing range. Sweet spot for entries.
- **Premium Zone:** Upper 25% of the dealing range. Ideal for shorts.
- **Discount Zone:** Lower 25% of the dealing range. Ideal for longs.
- **Equilibrium (EQ):** Midpoint of the dealing range. Price gravitates here before continuation.
- **Kill Zone (KZ):** High-probability trading windows: London (2-5 AM NY), NY AM (9:30-12 PM), NY PM (1:30-4 PM).
- **Silver Bullet:** FVGs that form during specific 1-hour windows (3-4 AM, 10-11 AM, 2-3 PM NY).
- **Macro Time:** 20-minute windows around key times (9:50-10:10, 10:50-11:10) where reversals often occur.
- **PO3 (Power of 3):** The daily cycle: Accumulation (Asia) → Manipulation (London sweep) → Distribution (NY trend).
- **IPDA (Interbank Price Delivery Algorithm):** The 20/40/60-day highs and lows that act as institutional targets.
- **Judas Swing:** A false move at the KZ open designed to sweep liquidity before the real move.
- **Turtle Soup:** ICT's term for fading a false breakout of equal highs/lows (liquidity pool raid).
- **Displacement:** A large-body candle with minimal wicks that shows aggressive institutional activity.

## OUTPUT FORMAT

Structure your response EXACTLY like this:

---

### 🔮 MARKET NARRATIVE
[2-3 sentences describing the current story: where price came from, what happened overnight/in the prior session, and what the market structure is saying]

### 📊 DIRECTIONAL BIAS: [BULLISH/BEARISH]
**DOL Target:** [price] ([source — e.g., "PDH", "BSL x3"])
**Bias Reason:** [why — e.g., "Asia low swept, MSS bullish confirmed"]
**Confidence:** [conviction score]%

### 🧩 ICT MODEL: [model name]
[1-2 sentences explaining what model was detected and why it qualifies]
**Active Flags:** [from model.flags]

### 🎯 TRADE SETUP
**Status:** [ACTIVE SETUP / DEVELOPING / NO TRADE]

If ACTIVE SETUP:
**Entry:** [price] — [type: OB/FVG/BRK/IFVG] in [Premium/Discount/OTE]
**Stop Loss:** [price] ([X] points risk)
**Target 1:** [price] ([X] points, [X]R)
**Target 2:** [price] ([X] points, [X]R) [if applicable]
**Risk-Reward:** [X]:1

If DEVELOPING:
**What's Missing:** [e.g., "Waiting for MSS confirmation" or "Need price to retrace to discount"]
**Levels to Watch:** [key levels]

If NO TRADE:
**Reason:** [e.g., "No Kill Zone active", "Narrative not confirmed", "Wrong P/D zone"]

### ⏰ SESSION CONTEXT
**Kill Zone:** [which KZ or none]
**PO3 Phase:** [Accumulation/Manipulation/Distribution]
**Key Levels:** PDH [price], PDL [price], Asia [high]-[low], EQ [price]

### ⚠️ RISK NOTES
[Any warnings: "price near IPDA level", "against higher timeframe trend", "low conviction", etc.]

---

## CRITICAL RULES

1. NEVER recommend a trade if narrative conviction is below 50%.
2. NEVER recommend a trade outside a Kill Zone unless the model is a confirmed 2022 Model or Unicorn.
3. If the model is "GENERIC", classify the setup as DEVELOPING, not ACTIVE.
4. Always calculate Risk-Reward. If R:R is below 2:1, note it as a warning.
5. If the DOL has been DELIVERED, note that the target has been hit and a new DOL needs to form.
6. If MSS is "NONE", the bias is unconfirmed — classify as DEVELOPING at best.
7. Be concise. This goes to a phone notification. No filler. Every word counts.
8. When analyzing the screenshot, look for: price action context the data might miss, how recent candles behave near key levels, whether displacement is visible, and any patterns not captured in the JSON.
9. For MNQ, typical stop loss buffer is 5-10 points beyond the entry zone. Typical targets are 20-60 points.
10. Express all prices to the tick (0.25 for MNQ).
"""
```

### Analysis Engine (analysis/engine.py)

```python
import anthropic
import base64
import structlog
from pathlib import Path
from config import settings
from webhook.models import TradingViewPayload
from screenshot.capture import get_screenshot
from .prompts import ICT_SYSTEM_PROMPT

logger = structlog.get_logger()

async def run_analysis_pipeline(payload: TradingViewPayload):
    """
    Full pipeline: screenshot → AI analysis → delivery.
    """
    # Step 1: Capture chart screenshot
    screenshot_path = await get_screenshot(
        output_path=f"screenshots/{payload.sym}_{payload.trigger}_{payload.ts}.png"
    )

    # Step 2: Run AI analysis
    analysis = await analyze_with_ai(payload, screenshot_path)

    # Step 3: Deliver results
    from delivery.discord_bot import send_discord_alert
    from delivery.telegram_bot import send_telegram_alert

    if settings.DELIVERY_METHOD in ("discord", "both"):
        await send_discord_alert(payload, analysis, screenshot_path)
    if settings.DELIVERY_METHOD in ("telegram", "both"):
        await send_telegram_alert(payload, analysis, screenshot_path)

    logger.info("pipeline_complete",
        trigger=payload.trigger,
        model=payload.model.name
    )


async def analyze_with_ai(
    payload: TradingViewPayload,
    screenshot_path: str
) -> str:
    """
    Send JSON data + chart screenshot to Claude for ICT analysis.
    Returns the formatted analysis text.
    """
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Read and encode screenshot
    image_data = Path(screenshot_path).read_bytes()
    base64_image = base64.standard_b64encode(image_data).decode("utf-8")

    # Build the user message with both data and image
    json_summary = format_payload_for_ai(payload)

    user_message = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": base64_image,
            },
        },
        {
            "type": "text",
            "text": f"""
Here is the current ICT indicator data and chart screenshot. Produce your market breakdown.

**Alert Trigger:** {payload.trigger}
**Symbol:** {payload.sym} | **Timeframe:** {payload.tf}min | **Current Price:** {payload.px}

{json_summary}

Analyze the chart screenshot alongside this data. Produce your ICT market breakdown following the exact output format specified.
"""
        }
    ]

    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2000,
        system=ICT_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}]
    )

    analysis_text = response.content[0].text
    logger.info("ai_analysis_complete", length=len(analysis_text))

    return analysis_text


def format_payload_for_ai(payload: TradingViewPayload) -> str:
    """
    Format the JSON payload into a readable summary for the AI.
    This is more efficient than sending raw JSON — it highlights what matters.
    """
    p = payload

    # Determine price position relative to key levels
    price_position = "UNKNOWN"
    if p.levels.eq:
        if p.px > p.levels.eq:
            price_position = "PREMIUM (above EQ)"
        else:
            price_position = "DISCOUNT (below EQ)"

    lines = [
        "## INDICATOR DATA",
        "",
        "### BIAS & DOL",
        f"- Direction: **{p.bias.dir}**",
        f"- DOL: {p.bias.dol} ({p.bias.dol_src})",
        f"- DOL Status: {p.bias.dol_status}",
        f"- Bias Reason: {p.bias.reason}",
        f"- Price Position: {price_position}",
        "",
        "### MARKET STRUCTURE",
        f"- MSS: **{p.struct.mss}**",
        f"- BOS Bull: {p.struct.bos_bull} | BOS Bear: {p.struct.bos_bear}",
        f"- CHoCH Bull: {p.struct.choch_bull} | CHoCH Bear: {p.struct.choch_bear}",
        f"- Displaced: {p.struct.displaced}",
        "",
        "### KEY LEVELS",
        f"- PDH: {p.levels.pdh} | PDL: {p.levels.pdl}",
        f"- Asia: {p.levels.asia_h} — {p.levels.asia_l} (Swept H: {p.levels.asia_swept_h}, Swept L: {p.levels.asia_swept_l})",
        f"- Dealing Range: {p.levels.deal_h} — {p.levels.deal_l}",
        f"- Equilibrium: {p.levels.eq}",
        f"- Premium: {p.levels.premium} | Discount: {p.levels.discount}",
        f"- OTE Zone: {p.levels.ote_h} — {p.levels.ote_l}",
        f"- IPDA 20D: {p.levels.ipda20h} — {p.levels.ipda20l}",
        f"- IPDA 40D: {p.levels.ipda40h} — {p.levels.ipda40l}",
        f"- IPDA 60D: {p.levels.ipda60h} — {p.levels.ipda60l}",
        "",
        "### NARRATIVE ENGINE",
        f"- State: **{p.narr.state}** | Direction: {p.narr.dir}",
        f"- Conviction: **{p.narr.score}%**",
        f"- Sweep: {p.narr.sweep} | MSS: {p.narr.mss} | Entry Available: {p.narr.entry}",
        f"- P/D Aligned: {p.narr.pd_aligned} | Kill Zone: {p.narr.kz} | Confirmation: {p.narr.confirm}",
        "",
        "### SMART ENTRY",
        f"- Found: **{p.entry.found}**",
        f"- Type: {p.entry.type} | Direction: {p.entry.dir}",
        f"- Price: {p.entry.px} (Zone: {p.entry.bot} — {p.entry.top})",
        f"- Score: {p.entry.score}",
        "",
        "### ICT MODEL",
        f"- Model: **{p.model.name}**",
        f"- Confidence: {p.model.conf}",
        f"- Flags: {p.model.flags}",
        "",
        "### SESSION",
        f"- Kill Zone: {p.session.kz}",
        f"- PO3 Phase: {p.session.po3}",
        f"- Macro Time: {p.session.macro} | Silver Bullet: {p.session.sb_time}",
    ]

    return "\n".join(lines)
```

---

## COMPONENT 4: DELIVERY BOTS

### Discord Delivery (delivery/discord_bot.py)

Uses Discord webhooks (no bot token needed — just create a webhook in your channel settings).

```python
import aiohttp
import structlog
from pathlib import Path
from config import settings
from webhook.models import TradingViewPayload

logger = structlog.get_logger()

# Trigger → emoji mapping
TRIGGER_EMOJI = {
    "PRE_MARKET_0915": "📋",
    "PRE_OPEN_0929": "🔒",
    "KZ_OPEN_LONDON": "🇬🇧",
    "KZ_OPEN_NY_AM": "🗽",
    "KZ_OPEN_NY_PM": "🌆",
    "CONVICTION_CROSSED": "🟢",
    "SETUP_FORMING": "🚨",
}

# Model → emoji mapping
MODEL_EMOJI = {
    "UNICORN": "🦄",
    "2022_MODEL": "📐",
    "SILVER_BULLET": "🔫",
    "JUDAS_SWING": "🎭",
    "TURTLE_SOUP": "🐢",
    "STANDARD_OTE": "🎯",
    "PO3_ENTRY": "📊",
    "GENERIC": "📌",
}


async def send_discord_alert(
    payload: TradingViewPayload,
    analysis: str,
    screenshot_path: str
):
    """Send analysis + screenshot to Discord via webhook."""

    trigger_emoji = TRIGGER_EMOJI.get(payload.trigger, "📡")
    model_emoji = MODEL_EMOJI.get(payload.model.name, "📌")

    # Build embed
    title = f"{trigger_emoji} {payload.trigger.replace('_', ' ')} — {payload.sym}"
    color = 0x00FF88 if payload.bias.dir == "BULL" else 0xFF4444

    # Discord has a 2000 char limit for embed descriptions
    # Truncate analysis if needed
    description = analysis[:1990] if len(analysis) > 1990 else analysis

    embed = {
        "title": title,
        "description": description,
        "color": color,
        "fields": [
            {
                "name": f"{model_emoji} Model",
                "value": payload.model.name.replace("_", " "),
                "inline": True
            },
            {
                "name": "🎯 Entry",
                "value": str(payload.entry.px) if payload.entry.found else "Scanning",
                "inline": True
            },
            {
                "name": "📊 Conviction",
                "value": f"{payload.narr.score}%",
                "inline": True
            },
        ],
        "footer": {"text": f"TF: {payload.tf}min | KZ: {payload.session.kz} | PO3: {payload.session.po3}"}
    }

    # Send with screenshot attachment
    form = aiohttp.FormData()
    form.add_field('payload_json', str({
        "embeds": [embed],
        "username": "ICT Analyst",
    }).replace("'", '"').replace("True", "true").replace("False", "false"))

    # Attach screenshot
    if Path(screenshot_path).exists():
        form.add_field(
            'file',
            open(screenshot_path, 'rb'),
            filename='chart.png',
            content_type='image/png'
        )

    async with aiohttp.ClientSession() as session:
        async with session.post(settings.DISCORD_WEBHOOK_URL, data=form) as resp:
            if resp.status in (200, 204):
                logger.info("discord_sent", trigger=payload.trigger)
            else:
                text = await resp.text()
                logger.error("discord_error", status=resp.status, body=text)
```

### Telegram Delivery (delivery/telegram_bot.py)

```python
import aiohttp
import structlog
from pathlib import Path
from config import settings
from webhook.models import TradingViewPayload

logger = structlog.get_logger()


async def send_telegram_alert(
    payload: TradingViewPayload,
    analysis: str,
    screenshot_path: str
):
    """Send analysis + screenshot to Telegram."""

    base_url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

    # Telegram has a 1024 char caption limit for photos
    # Send photo first, then full analysis as a separate message

    # Step 1: Send screenshot with brief caption
    direction_emoji = "🟢" if payload.bias.dir == "BULL" else "🔴"
    caption = (
        f"{direction_emoji} **{payload.trigger.replace('_', ' ')}**\n"
        f"📈 {payload.sym} | {payload.model.name.replace('_', ' ')}\n"
        f"🎯 Entry: {payload.entry.px if payload.entry.found else 'Scanning'}\n"
        f"📊 Conviction: {payload.narr.score}%"
    )

    async with aiohttp.ClientSession() as session:
        # Send photo
        if Path(screenshot_path).exists():
            form = aiohttp.FormData()
            form.add_field('chat_id', settings.TELEGRAM_CHAT_ID)
            form.add_field('caption', caption)
            form.add_field('parse_mode', 'Markdown')
            form.add_field(
                'photo',
                open(screenshot_path, 'rb'),
                filename='chart.png',
                content_type='image/png'
            )

            async with session.post(f"{base_url}/sendPhoto", data=form) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    logger.error("telegram_photo_error", status=resp.status, body=text)

        # Step 2: Send full analysis as text message
        # Telegram max message length is 4096
        truncated = analysis[:4090] if len(analysis) > 4090 else analysis

        async with session.post(f"{base_url}/sendMessage", json={
            "chat_id": settings.TELEGRAM_CHAT_ID,
            "text": truncated,
            "parse_mode": "Markdown"
        }) as resp:
            if resp.status == 200:
                logger.info("telegram_sent", trigger=payload.trigger)
            else:
                text = await resp.text()
                logger.error("telegram_text_error", status=resp.status, body=text)
```

---

## MAIN SERVER (main.py)

```python
import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
from webhook.receiver import router as webhook_router
from screenshot.capture import _screenshotter
import structlog
from pathlib import Path

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Create directories
    Path("screenshots").mkdir(exist_ok=True)
    logger.info("server_starting")
    yield
    # Cleanup
    if _screenshotter:
        await _screenshotter.close()
    logger.info("server_stopped")

app = FastAPI(
    title="ICT AI Trading Analyst",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(webhook_router)

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

---

## CONFIGURATION (config.py)

```python
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WEBHOOK_SECRET: str = ""

    TV_USERNAME: str = ""
    TV_PASSWORD: str = ""
    TV_CHART_URL: str = ""

    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-5-20250929"

    DISCORD_WEBHOOK_URL: str = ""

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    DELIVERY_METHOD: str = "discord"  # "discord", "telegram", "both"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## TEST PAYLOAD (tests/sample_payload.json)

Use this to test the pipeline without TradingView:

```json
{
    "v": 1,
    "trigger": "SETUP_FORMING",
    "sym": "MNQ1!",
    "tf": "5",
    "px": 17845.25,
    "ts": 1707321600000,
    "bias": {
        "dir": "BULL",
        "dol": 17920.50,
        "dol_src": "BSL x3",
        "dol_status": "ACTIVE",
        "reason": "ASIA_SWEEP"
    },
    "struct": {
        "mss": "BULL",
        "bos_bull": false,
        "bos_bear": false,
        "choch_bull": true,
        "choch_bear": false,
        "displaced": true
    },
    "levels": {
        "pdh": 17900.00,
        "pdl": 17750.00,
        "asia_h": 17870.00,
        "asia_l": 17810.00,
        "asia_swept_h": false,
        "asia_swept_l": true,
        "eq": 17825.00,
        "premium": 17862.50,
        "discount": 17787.50,
        "deal_h": 17900.00,
        "deal_l": 17750.00,
        "ote_h": 17806.50,
        "ote_l": 17781.50,
        "ipda20h": 18050.00,
        "ipda20l": 17500.00,
        "ipda40h": 18200.00,
        "ipda40l": 17400.00,
        "ipda60h": 18350.00,
        "ipda60l": 17200.00
    },
    "narr": {
        "state": "ACTIVE",
        "dir": "BULL",
        "score": 78,
        "sweep": true,
        "mss": true,
        "entry": true,
        "pd_aligned": true,
        "kz": true,
        "confirm": false
    },
    "entry": {
        "found": true,
        "type": "FVG",
        "dir": "BULL",
        "px": 17802.50,
        "top": 17810.00,
        "bot": 17795.00,
        "score": 85.0
    },
    "model": {
        "name": "2022_MODEL",
        "conf": 0.85,
        "flags": "2022,OTE,DISCOUNT,KZ,"
    },
    "session": {
        "kz": "NY_AM",
        "po3": "MANIPULATION",
        "macro": false,
        "sb_time": true
    }
}
```

### Test Command

```bash
curl -X POST http://localhost:8000/webhook \
  -H "Content-Type: application/json" \
  -d @tests/sample_payload.json
```

---

## DEPLOYMENT OPTIONS

### Option 1: Local PC (Simplest)

Run the server on your PC. Use ngrok to expose it to TradingView:

```bash
# Terminal 1: Start server
python main.py

# Terminal 2: Expose via ngrok
ngrok http 8000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io/webhook`) into TradingView's alert webhook field.

**Pros:** Free, simple, your PC is always on during trading hours.
**Cons:** Stops when PC sleeps, ngrok URL changes on restart (unless paid).

### Option 2: VPS (Reliable)

Deploy to a $5-10/month VPS (DigitalOcean, Linode, Vultr):

```bash
# On VPS
git clone your-repo
cd ict-ai-analyst
pip install -r requirements.txt
playwright install chromium --with-deps

# Run with systemd or supervisor for persistence
nohup python main.py &
```

Use a domain or the VPS IP as your webhook URL.

### Option 3: Docker (Production)

```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libatspi2.0-0 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libasound2

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN playwright install chromium

COPY . .
CMD ["python", "main.py"]
```

---

## SETUP CHECKLIST

When building this system, complete these steps in order:

- [ ] Create project directory structure
- [ ] Create `.env` with all credentials
- [ ] Install Python dependencies
- [ ] Install Playwright browsers (`playwright install chromium`)
- [ ] Build and test webhook receiver (use sample_payload.json)
- [ ] Build and test screenshot capture (verify TradingView login works)
- [ ] Build AI analysis engine with ICT system prompt
- [ ] Set up Discord webhook (Server Settings → Integrations → Webhooks)
- [ ] OR set up Telegram bot (@BotFather → /newbot)
- [ ] Test full pipeline end-to-end with sample payload
- [ ] Configure TradingView alert with webhook URL
- [ ] Enable "AI Data Export" in the indicator settings
- [ ] Create alert: Condition → "Any alert() function call" → Webhook URL

---

## IMPORTANT NOTES

1. **TradingView Login:** Playwright needs to handle TradingView's auth flow. If they use CAPTCHA or 2FA, you may need to do initial login manually and save cookies. Consider using `context.storage_state()` to persist the session.

2. **Rate Limits:** Anthropic API has rate limits. The indicator won't fire more than once per bar per trigger, so this shouldn't be an issue, but add retry logic with exponential backoff.

3. **Screenshot Quality:** Use `device_scale_factor=2` for retina-quality screenshots. The AI needs to read the dashboard text and see candle patterns clearly.

4. **Alert Timing:** TradingView free accounts have limited alert slots. If you need more, consider TradingView Premium. The AI Export alert uses `alert()` (not `alertcondition()`), so it counts as one alert regardless of how many triggers fire.

5. **JSON Size:** TradingView alerts have a message size limit (~4KB). The JSON payload is designed to be compact (~1.5KB) to stay well within this limit.

6. **Time Sensitivity:** For `SETUP_FORMING` triggers, speed matters. The full pipeline (screenshot + AI analysis + delivery) should complete in under 30 seconds. Consider skipping the screenshot for time-critical alerts and sending just the JSON analysis.

7. **Error Recovery:** If the screenshot engine fails (TradingView session expired, etc.), the system should still send the AI analysis based on JSON data alone, with a note that the screenshot was unavailable.
