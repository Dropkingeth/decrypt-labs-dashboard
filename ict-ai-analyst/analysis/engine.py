from typing import Optional
import base64
import structlog
from pathlib import Path
from config import settings
from webhook.models import TradingViewPayload
from screenshot.capture import get_screenshot
from .prompts import ICT_SYSTEM_PROMPT

logger = structlog.get_logger()

# Try to import the right client based on config
try:
    import anthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


async def run_analysis_pipeline(payload: TradingViewPayload):
    """
    Full pipeline: screenshot → AI analysis → delivery.
    """
    # Step 1: Skip screenshot for now (Playwright TradingView login is flaky)
    # TODO: Use OpenClaw browser for chart screenshots instead
    screenshot_path = None

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
    screenshot_path: Optional[str] = None
) -> str:
    """
    Send JSON data to AI for ICT analysis.
    Uses DeepSeek (cheap) or Anthropic (premium) based on config.
    Returns the formatted analysis text.
    """
    json_summary = format_payload_for_ai(payload)
    
    user_text = f"""
Here is the current ICT indicator data. Produce your market breakdown.

**Alert Trigger:** {payload.trigger}
**Symbol:** {payload.sym} | **Timeframe:** {payload.tf}min | **Current Price:** {payload.px}

{json_summary}

Analyze based on the JSON data. Produce your ICT market breakdown following the exact output format specified.
"""

    # Use DeepSeek (OpenAI-compatible API) — much cheaper
    provider = getattr(settings, 'AI_PROVIDER', 'deepseek')
    
    if provider == 'deepseek':
        api_key = getattr(settings, 'DEEPSEEK_API_KEY', settings.ANTHROPIC_API_KEY)
        model = getattr(settings, 'DEEPSEEK_MODEL', 'deepseek-chat')
        
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": ICT_SYSTEM_PROMPT},
                        {"role": "user", "content": user_text}
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.3
                }
            )
            
            if response.status_code != 200:
                logger.error("deepseek_error", status=response.status_code, body=response.text[:200])
                return f"⚠️ AI analysis failed (status {response.status_code}). Raw data:\n{json_summary}"
            
            data = response.json()
            analysis_text = data["choices"][0]["message"]["content"]
    else:
        # Anthropic fallback
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        user_content = [{"type": "text", "text": user_text}]
        
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2000,
            system=ICT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}]
        )
        analysis_text = response.content[0].text

    logger.info("ai_analysis_complete", provider=provider, length=len(analysis_text))
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
