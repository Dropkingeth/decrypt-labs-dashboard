from typing import Optional
import json
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
    screenshot_path: Optional[str] = None
):
    """Send analysis + screenshot to Discord via webhook."""

    if not settings.DISCORD_WEBHOOK_URL:
        logger.warning("discord_skipped", reason="No webhook URL configured")
        return

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
        "footer": {
            "text": f"TF: {payload.tf}min | KZ: {payload.session.kz} | PO3: {payload.session.po3}"
        }
    }

    # Build the JSON payload
    webhook_payload = {
        "embeds": [embed],
        "username": "ICT Analyst",
    }

    form = aiohttp.FormData()
    form.add_field(
        'payload_json',
        json.dumps(webhook_payload)
    )

    # Attach screenshot if available
    if screenshot_path and Path(screenshot_path).exists():
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
