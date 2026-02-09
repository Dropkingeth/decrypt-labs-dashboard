"""
Tests for analysis engine and AI formatting.
Run with: pytest tests/test_analysis.py -v
"""
import pytest
import json
from pathlib import Path

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from webhook.models import TradingViewPayload
from analysis.engine import format_payload_for_ai
from analysis.prompts import ICT_SYSTEM_PROMPT


def load_sample_payload():
    """Load the sample payload from JSON file."""
    sample_path = Path(__file__).parent / "sample_payload.json"
    with open(sample_path) as f:
        return json.load(f)


class TestPayloadFormatting:
    def test_format_payload_includes_all_sections(self):
        payload = TradingViewPayload(**load_sample_payload())
        formatted = format_payload_for_ai(payload)
        
        # Check all major sections are present
        assert "## INDICATOR DATA" in formatted
        assert "### BIAS & DOL" in formatted
        assert "### MARKET STRUCTURE" in formatted
        assert "### KEY LEVELS" in formatted
        assert "### NARRATIVE ENGINE" in formatted
        assert "### SMART ENTRY" in formatted
        assert "### ICT MODEL" in formatted
        assert "### SESSION" in formatted

    def test_format_payload_includes_key_values(self):
        payload = TradingViewPayload(**load_sample_payload())
        formatted = format_payload_for_ai(payload)
        
        # Check specific values are included
        assert "BULL" in formatted
        assert "17920.5" in formatted  # DOL
        assert "BSL x3" in formatted
        assert "2022_MODEL" in formatted
        assert "78%" in formatted  # Conviction
        assert "NY_AM" in formatted  # Kill Zone

    def test_price_position_detection_premium(self):
        payload_data = load_sample_payload()
        payload_data["px"] = 17850.0  # Above EQ (17825)
        payload = TradingViewPayload(**payload_data)
        formatted = format_payload_for_ai(payload)
        
        assert "PREMIUM (above EQ)" in formatted

    def test_price_position_detection_discount(self):
        payload_data = load_sample_payload()
        payload_data["px"] = 17800.0  # Below EQ (17825)
        payload = TradingViewPayload(**payload_data)
        formatted = format_payload_for_ai(payload)
        
        assert "DISCOUNT (below EQ)" in formatted


class TestSystemPrompt:
    def test_prompt_includes_ict_terminology(self):
        assert "DOL (Draw on Liquidity)" in ICT_SYSTEM_PROMPT
        assert "MSS (Market Structure Shift)" in ICT_SYSTEM_PROMPT
        assert "FVG (Fair Value Gap)" in ICT_SYSTEM_PROMPT
        assert "OTE (Optimal Trade Entry)" in ICT_SYSTEM_PROMPT
        assert "Kill Zone" in ICT_SYSTEM_PROMPT

    def test_prompt_includes_output_format(self):
        assert "### 🔮 MARKET NARRATIVE" in ICT_SYSTEM_PROMPT
        assert "### 📊 DIRECTIONAL BIAS" in ICT_SYSTEM_PROMPT
        assert "### 🧩 ICT MODEL" in ICT_SYSTEM_PROMPT
        assert "### 🎯 TRADE SETUP" in ICT_SYSTEM_PROMPT
        assert "### ⏰ SESSION CONTEXT" in ICT_SYSTEM_PROMPT
        assert "### ⚠️ RISK NOTES" in ICT_SYSTEM_PROMPT

    def test_prompt_includes_critical_rules(self):
        assert "CRITICAL RULES" in ICT_SYSTEM_PROMPT
        assert "conviction is below 50%" in ICT_SYSTEM_PROMPT
        assert "GENERIC" in ICT_SYSTEM_PROMPT
        assert "Risk-Reward" in ICT_SYSTEM_PROMPT

    def test_prompt_length_reasonable(self):
        # System prompt shouldn't be too long (token cost) or too short (missing detail)
        prompt_length = len(ICT_SYSTEM_PROMPT)
        assert prompt_length > 3000, "Prompt seems too short"
        assert prompt_length < 10000, "Prompt seems too long"


class TestTriggerTypes:
    """Test different trigger types are handled correctly."""
    
    @pytest.mark.parametrize("trigger,expected_urgency", [
        ("PRE_MARKET_0915", "informational"),
        ("PRE_OPEN_0929", "medium"),
        ("KZ_OPEN_NY_AM", "high"),
        ("SETUP_FORMING", "critical"),
    ])
    def test_trigger_types(self, trigger, expected_urgency):
        payload_data = load_sample_payload()
        payload_data["trigger"] = trigger
        payload = TradingViewPayload(**payload_data)
        
        # Just verify the trigger is parsed correctly
        assert payload.trigger == trigger


class TestModelTypes:
    """Test different ICT model types are handled correctly."""
    
    @pytest.mark.parametrize("model_name", [
        "UNICORN",
        "2022_MODEL",
        "SILVER_BULLET",
        "JUDAS_SWING",
        "TURTLE_SOUP",
        "STANDARD_OTE",
        "PO3_ENTRY",
        "GENERIC",
    ])
    def test_model_names(self, model_name):
        payload_data = load_sample_payload()
        payload_data["model"]["name"] = model_name
        payload = TradingViewPayload(**payload_data)
        
        assert payload.model.name == model_name
        
        # Format and verify model appears in output
        formatted = format_payload_for_ai(payload)
        assert model_name in formatted


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
