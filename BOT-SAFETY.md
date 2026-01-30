# Bot Safety Protocol
*Never lose an account to a preventable mistake again.*

---

## 🚨 THE RULE

**After the stoploss incident:** We lost 2 accounts that were close to passing because a script update broke the stoploss while at work.

**The Lesson:** NEVER deploy untested changes when you can't monitor.

---

## 🌙 EVENING PROTOCOL (6:30 PM — Before Sleep)

```
[ ] 1. PAUSE OTE Silver Bullet
[ ] 2. RESTART FVG+IFVG (Determining Order Flow)
[ ] 3. VERIFY FVG+IFVG is ONLINE in TradersPost
[ ] 4. Check current drawdown levels
[ ] 5. Screenshot positions (if any open)
```

**Why restart FVG+IFVG?** Fresh start for overnight session, clears any state issues.

**Why pause OTE?** Only run what you trust overnight. One bot = less risk.

---

## 🌅 MORNING PROTOCOL (3:50 AM — First Thing)

```
[ ] 1. CHECK: FVG+IFVG still running from overnight
[ ] 2. CHECK: Any overnight trades/issues
[ ] 3. START: OTE Silver Bullet
[ ] 4. VERIFY: Both bots ONLINE in TradersPost
[ ] 5. VERIFY: Both bots connected to Tradovate
[ ] 6. CHECK: Drawdown levels on both accounts
```

**DO NOT leave for work until ALL boxes checked!**

---

## ⚠️ SCRIPT UPDATE SAFETY

### BEFORE Any Code Change:

```
[ ] 1. Is this URGENT? If no, wait for weekend.
[ ] 2. Do you have 2+ hours to monitor after deploy?
[ ] 3. Is market CLOSED or low-volume?
[ ] 4. Have you tested on SIM first?
[ ] 5. Is stoploss logic UNCHANGED?
```

### The Stoploss Checklist:

```
[ ] Stoploss value is hardcoded correctly
[ ] Stoploss logic fires on every tick
[ ] Stoploss is NOT dependent on external API
[ ] Stoploss works if webhook fails
[ ] TEST: Manually trigger a losing trade on SIM
```

### NEVER Deploy When:

- ❌ Market is open and you're leaving for work
- ❌ You can't monitor for at least 1-2 hours
- ❌ You haven't tested the specific change on SIM
- ❌ You're tired or rushing
- ❌ Friday before a 3-day weekend

### SAFE Deploy Windows:

- ✅ Saturday/Sunday (market closed)
- ✅ Weekday evening AFTER market close (5 PM+)
- ✅ Early morning BEFORE market open (if you can monitor)

---

## 🔴 RED FLAGS — STOP TRADING IMMEDIATELY

If any of these happen, PAUSE ALL BOTS and investigate:

- [ ] Stoploss didn't trigger when it should have
- [ ] Bot placed unexpected trade
- [ ] Position size is wrong
- [ ] Bot went offline unexpectedly
- [ ] Drawdown jumped significantly
- [ ] TradersPost shows errors
- [ ] Tradovate connection issues

---

## 📊 DAILY HEALTH CHECK

| Check | OTE Silver Bullet | FVG+IFVG |
|-------|-------------------|----------|
| Status | ⬜ Online | ⬜ Online |
| Connected | ⬜ Tradovate | ⬜ Tradovate |
| Drawdown | $____ / $6,000 | $____ / $6,000 |
| Today PnL | $____ | $____ |
| Issues? | ⬜ None | ⬜ None |

---

## 💡 LESSONS LEARNED

### Incident: Stoploss Failure (Jan 2026)
- **What happened:** Script update broke stoploss logic
- **When:** While at work, couldn't monitor
- **Result:** 2 accounts close to passing — blown
- **Root cause:** Deployed during market hours without testing
- **Fix:** Never deploy without testing + monitoring window

### Future Incidents:
*(Log any issues here so we don't repeat them)*

---

## 🎯 THE MANTRA

> "Protect the account. Profits come from survival."

Every trade you DON'T lose is money saved.
Every account you DON'T blow is weeks of progress kept.

**Paranoid is good. Paranoid keeps you funded.**

---

*Last updated: 2026-01-28*
