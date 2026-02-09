from typing import Optional
import aiohttp
import structlog
from pathlib import Path
from config import settings
from webhook.models import TradingViewPayload

logger = structlog.get_logger()


async def send_telegram_alert(
    payload: TradingViewPayload,
    analysis: str,
    screenshot_path: Optional[str] = None
):
    """Send analysis + screenshot to Telegram."""

    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("telegram_skipped", reason="No bot token or chat ID configured")
        return

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
        # Send photo if screenshot exists
        if screenshot_path and Path(screenshot_path).exists():
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
