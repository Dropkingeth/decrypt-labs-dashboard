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
        self._playwright = None

    async def initialize(self):
        """Launch browser and authenticate to TradingView."""
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage']
        )
        self.context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            device_scale_factor=2  # Retina-quality screenshots
        )
        self.page = await self.context.new_page()
        logger.info("browser_initialized")

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

        # Ensure output directory exists
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        # Capture screenshot
        await self.page.screenshot(path=str(path), full_page=False)

        logger.info("screenshot_captured", path=str(path))
        return str(path)

    async def close(self):
        """Clean up browser resources."""
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("browser_closed")


# Singleton instance
_screenshotter = None


async def get_screenshot(output_path: str = "chart.png") -> str:
    """Get a chart screenshot. Initializes browser on first call."""
    global _screenshotter
    if _screenshotter is None:
        _screenshotter = TradingViewScreenshot()
        await _screenshotter.initialize()
    return await _screenshotter.capture(output_path)


async def close_screenshotter():
    """Close the screenshot browser instance."""
    global _screenshotter
    if _screenshotter:
        await _screenshotter.close()
        _screenshotter = None
