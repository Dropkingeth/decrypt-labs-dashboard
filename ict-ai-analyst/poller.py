"""
ICT Alert Poller — Polls Railway caretaker for new ICT analysis alerts
and triggers the local analysis pipeline.

Runs continuously, checking every 30 seconds for new alerts.
"""

import asyncio
import httpx
import json
import time
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

CARETAKER_URL = "https://decrypt-caretaker-production.up.railway.app"
POLL_INTERVAL = 30  # seconds
LAST_SEEN_FILE = Path(__file__).parent / ".last-alert-ts"

def get_last_seen():
    """Get timestamp of last processed alert."""
    try:
        return LAST_SEEN_FILE.read_text().strip()
    except:
        return None

def set_last_seen(ts):
    """Save timestamp of last processed alert."""
    LAST_SEEN_FILE.write_text(ts)

async def poll_for_alerts():
    """Poll caretaker API for new ICT alerts."""
    last_seen = get_last_seen()
    
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(f"{CARETAKER_URL}/api/signals?bot=ict-analysis")
            if resp.status_code != 200:
                print(f"[Poller] API error: {resp.status_code}")
                return []
            
            signals = resp.json()
            
            # Filter to new signals only
            new_signals = []
            for signal in signals:
                ts = signal.get("timestamp", "")
                if last_seen and ts <= last_seen:
                    break  # Already processed (signals are newest-first)
                # Skip test payloads
                raw_alert = signal.get("raw", {}).get("alert", {})
                if raw_alert.get("test"):
                    continue
                new_signals.append(signal)
            
            return new_signals
            
        except Exception as e:
            print(f"[Poller] Error polling: {e}")
            return []

async def process_alert(signal):
    """Process a single ICT alert through the analysis pipeline."""
    alert_data = signal.get("raw", {}).get("alert", {})
    timestamp = signal.get("timestamp", "unknown")
    
    print(f"\n{'='*60}")
    print(f"🧠 NEW ICT ALERT @ {timestamp}")
    print(f"{'='*60}")
    print(json.dumps(alert_data, indent=2))
    
    # Import and run the full analysis pipeline (AI analysis + delivery)
    try:
        from webhook.models import TradingViewPayload
        from analysis.engine import run_analysis_pipeline
        
        # Parse the alert data into the expected model
        payload = TradingViewPayload(**alert_data)
        print(f"   Trigger: {payload.trigger}")
        print(f"   Symbol: {payload.sym} @ {payload.px}")
        print(f"   Bias: {payload.bias.dir} | Model: {payload.model.name}")
        print(f"   Conviction: {payload.narr.score}%")
        
        # Run full pipeline: screenshot → AI analysis → deliver to Telegram
        await run_analysis_pipeline(payload)
        print(f"\n✅ Analysis complete + delivered!")
        return True
    except ImportError as e:
        print(f"[Poller] Import error: {e}")
        return None
    except Exception as e:
        print(f"[Poller] Analysis error: {e}")
        import traceback
        traceback.print_exc()
        return None

async def main():
    """Main polling loop."""
    print(f"🔄 ICT Alert Poller started")
    print(f"   Polling: {CARETAKER_URL}/api/signals?bot=ict-analysis")
    print(f"   Interval: {POLL_INTERVAL}s")
    print(f"   Last seen: {get_last_seen() or 'never'}")
    print()
    
    while True:
        try:
            new_alerts = await poll_for_alerts()
            
            if new_alerts:
                print(f"📥 {len(new_alerts)} new alert(s) found!")
                
                # Process in chronological order (oldest first)
                for signal in reversed(new_alerts):
                    await process_alert(signal)
                    set_last_seen(signal["timestamp"])
            
        except KeyboardInterrupt:
            print("\n[Poller] Shutting down...")
            break
        except Exception as e:
            print(f"[Poller] Unexpected error: {e}")
        
        await asyncio.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    asyncio.run(main())
