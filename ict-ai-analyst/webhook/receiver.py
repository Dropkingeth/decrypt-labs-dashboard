from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from .models import TradingViewPayload
import structlog

router = APIRouter()
logger = structlog.get_logger()


async def process_webhook(payload: TradingViewPayload):
    """Background task to process the webhook through the analysis pipeline."""
    try:
        from analysis.engine import run_analysis_pipeline
        await run_analysis_pipeline(payload)
    except Exception as e:
        logger.error("pipeline_error", error=str(e), trigger=payload.trigger)


@router.post("/webhook")
async def receive_webhook(request: Request, background_tasks: BackgroundTasks):
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

        # Process in background to return quickly to TradingView
        background_tasks.add_task(process_webhook, payload)

        return {"status": "ok", "trigger": payload.trigger}

    except Exception as e:
        logger.error("webhook_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook/test")
async def test_webhook(request: Request):
    """
    Test endpoint - validates payload without triggering the pipeline.
    Useful for testing TradingView alert configuration.
    """
    try:
        body = await request.json()
        payload = TradingViewPayload(**body)

        return {
            "status": "ok",
            "parsed": {
                "trigger": payload.trigger,
                "symbol": payload.sym,
                "model": payload.model.name,
                "conviction": payload.narr.score,
                "entry_found": payload.entry.found,
                "entry_price": payload.entry.px
            }
        }

    except Exception as e:
        logger.error("webhook_test_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
