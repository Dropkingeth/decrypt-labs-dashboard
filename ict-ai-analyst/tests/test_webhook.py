"""
Tests for webhook receiver and payload validation.
Run with: pytest tests/test_webhook.py -v
"""
import pytest
import json
from pathlib import Path
from fastapi.testclient import TestClient

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app
from webhook.models import TradingViewPayload


client = TestClient(app)


def load_sample_payload():
    """Load the sample payload from JSON file."""
    sample_path = Path(__file__).parent / "sample_payload.json"
    with open(sample_path) as f:
        return json.load(f)


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestWebhookTestEndpoint:
    def test_valid_payload_parses_correctly(self):
        payload = load_sample_payload()
        response = client.post("/webhook/test", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["parsed"]["trigger"] == "SETUP_FORMING"
        assert data["parsed"]["symbol"] == "MNQ1!"
        assert data["parsed"]["model"] == "2022_MODEL"
        assert data["parsed"]["conviction"] == 78
        assert data["parsed"]["entry_found"] == True
        assert data["parsed"]["entry_price"] == 17802.50

    def test_invalid_payload_returns_400(self):
        response = client.post("/webhook/test", json={"invalid": "data"})
        assert response.status_code == 400

    def test_empty_payload_returns_400(self):
        response = client.post("/webhook/test", json={})
        assert response.status_code == 400


class TestPayloadModel:
    def test_model_parses_sample_payload(self):
        payload = load_sample_payload()
        parsed = TradingViewPayload(**payload)
        
        assert parsed.v == 1
        assert parsed.trigger == "SETUP_FORMING"
        assert parsed.sym == "MNQ1!"
        assert parsed.tf == "5"
        assert parsed.px == 17845.25
        
        # Bias
        assert parsed.bias.dir == "BULL"
        assert parsed.bias.dol == 17920.50
        assert parsed.bias.dol_src == "BSL x3"
        
        # Structure
        assert parsed.struct.mss == "BULL"
        assert parsed.struct.choch_bull == True
        assert parsed.struct.displaced == True
        
        # Levels
        assert parsed.levels.pdh == 17900.00
        assert parsed.levels.pdl == 17750.00
        assert parsed.levels.asia_swept_l == True
        
        # Narrative
        assert parsed.narr.state == "ACTIVE"
        assert parsed.narr.score == 78
        assert parsed.narr.sweep == True
        
        # Entry
        assert parsed.entry.found == True
        assert parsed.entry.type == "FVG"
        assert parsed.entry.px == 17802.50
        
        # Model
        assert parsed.model.name == "2022_MODEL"
        assert parsed.model.conf == 0.85
        
        # Session
        assert parsed.session.kz == "NY_AM"
        assert parsed.session.po3 == "MANIPULATION"
        assert parsed.session.sb_time == True

    def test_model_handles_optional_fields(self):
        """Test that optional fields can be None."""
        minimal_payload = {
            "v": 1,
            "trigger": "TEST",
            "sym": "MNQ1!",
            "tf": "5",
            "px": 17800.0,
            "ts": 1707321600000,
            "bias": {
                "dir": "BULL",
                "dol": None,
                "dol_src": "NONE",
                "dol_status": "SEEKING",
                "reason": "NONE"
            },
            "struct": {
                "mss": "NONE",
                "bos_bull": False,
                "bos_bear": False,
                "choch_bull": False,
                "choch_bear": False,
                "displaced": False
            },
            "levels": {
                "pdh": None,
                "pdl": None,
                "asia_h": None,
                "asia_l": None,
                "asia_swept_h": False,
                "asia_swept_l": False,
                "eq": None,
                "premium": None,
                "discount": None,
                "deal_h": None,
                "deal_l": None,
                "ote_h": None,
                "ote_l": None,
                "ipda20h": None,
                "ipda20l": None,
                "ipda40h": None,
                "ipda40l": None,
                "ipda60h": None,
                "ipda60l": None
            },
            "narr": {
                "state": "NONE",
                "dir": "NONE",
                "score": 0,
                "sweep": False,
                "mss": False,
                "entry": False,
                "pd_aligned": False,
                "kz": False,
                "confirm": False
            },
            "entry": {
                "found": False,
                "type": "NONE",
                "dir": "NONE",
                "px": None,
                "top": None,
                "bot": None,
                "score": 0.0
            },
            "model": {
                "name": "GENERIC",
                "conf": 0.0,
                "flags": ""
            },
            "session": {
                "kz": "NONE",
                "po3": "UNKNOWN",
                "macro": False,
                "sb_time": False
            }
        }
        
        parsed = TradingViewPayload(**minimal_payload)
        assert parsed.bias.dol is None
        assert parsed.entry.px is None
        assert parsed.levels.pdh is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
