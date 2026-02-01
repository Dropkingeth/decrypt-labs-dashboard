# Settings Update Prompt

Copy this prompt and send it to Claude along with your settings screenshots.

---

## PROMPT:

```
I need to update my TradingView PineScript strategy settings to match these baseline screenshots.

**TASK:**
1. Look at the attached screenshot(s) of my CURRENT settings
2. Compare them to the BASELINE settings (attached or in bot-settings folder)
3. List ANY differences you find
4. Generate the PineScript code to update the default values to match the baseline

**BOT:** [OTE Silver Bullet / FVG+IFVG / FVG Bias] (specify which one)

**BASELINE SCREENSHOTS:** (attached or reference from bot-settings folder)

**CURRENT SCREENSHOTS:** (attach your current settings)

**OUTPUT FORMAT:**
1. Differences table (Setting | Baseline | Current)
2. PineScript input() declarations with correct defaults
3. Any warnings about critical settings (stoploss, position size, etc.)
```

---

## EXAMPLE USAGE:

**You:** "Hey Jimmy, I updated the OTE strategy. Here's my current settings screenshot. Compare to baseline and tell me what changed."

**Attach:** 
- Current settings screenshot from TradingView

**I'll:**
1. Load the baseline from `/ideas/decrypt-labs/bot-settings/`
2. Compare visually
3. Report differences
4. Generate corrected PineScript defaults if needed

---

## QUICK VERIFY COMMAND:

For a quick check without generating code:

```
Compare my current [BOT NAME] settings to baseline. 
Just tell me YES (matches) or NO (list differences).
[attach screenshot]
```

---

## MAKING NEW SETTINGS DEFAULT

If you INTENTIONALLY changed settings and want them as the new default:

```
I've updated [BOT NAME] settings intentionally. 

1. Here's my NEW settings screenshot (attach)
2. Generate PineScript input() code with these as defaults
3. Replace the baseline screenshot with this new one

Changes made:
- [list what you changed and why]
```

---

*This prompt ensures settings are always verified against visual source of truth.*
