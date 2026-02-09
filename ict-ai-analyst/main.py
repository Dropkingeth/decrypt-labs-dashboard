import uvicorn
from fastapi import FastAPI
from contextlib import asynccontextmanager
from webhook.receiver import router as webhook_router
from screenshot.capture import close_screenshotter
from utils.logger import setup_logging
from config import settings
import structlog
from pathlib import Path

# Initialize logging
setup_logging()
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Create directories
    Path("screenshots").mkdir(exist_ok=True)
    logger.info("server_starting", host=settings.HOST, port=settings.PORT)
    yield
    # Cleanup
    await close_screenshotter()
    logger.info("server_stopped")


app = FastAPI(
    title="ICT AI Trading Analyst",
    description="Receives TradingView webhooks, captures chart screenshots, runs ICT analysis via Claude, and delivers to Discord/Telegram",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(webhook_router)


@app.get("/")
async def root():
    """Root endpoint with basic info."""
    return {
        "name": "ICT AI Trading Analyst",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "webhook": "/webhook",
            "health": "/health",
            "test": "/webhook/test"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
