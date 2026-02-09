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
