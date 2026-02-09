# Decrypt Labs — Data Template & Audit

All pages pull from: `https://decrypt-caretaker-production.up.railway.app/api/site-config`

**Last Audit:** 2026-02-09

---

## API Verification (/api/site-config)

| Field | Value | Status |
|-------|-------|--------|
| global.totalAUM | 755,090 | ✅ |
| global.activeBots | 4 | ✅ |
| global.totalBots | 4 | ✅ |
| global.totalPnl | 5,090.42 | ✅ |
| global.todayPnl | 338.52 | ✅ |
| global.totalTrades | 5,204 | ✅ |
| global.signalCount24h | 0 | ✅ |
| bots (4 entries) | Tina, Danny, Annie, Mike | ✅ |
| graveyard (1 entry) | Rekt Riley | ✅ |
| racing data | All periods populated | ✅ (Mike missing from racing scores) |
| notices | 1 active notice | ✅ |

---

## Page 1: Landing Page (index.html)

### Hero Section
| Data Point | Source | Dynamic? | Status |
|-----------|--------|----------|--------|
| "4 BOTS ACTIVE" badge | `data-stat="bots"` | ✅ Fetched | ✅ Correct |
| Bot list in terminal (Tina, Danny, Annie, Mike) | HTML | ⚠️ Hardcoded | Correct names, but hardcoded status |
| Bot count in terminal | `data-stat="bots-count"` | ✅ Fetched | ✅ Correct |
| AUM in terminal | `data-stat="aum"` | ✅ Fetched | ✅ Correct |
| Win rate in terminal | `data-stat="winrate"` | ✅ Fetched | ✅ Fixed (was hardcoded 69.4%) |
| Total trades in terminal | `data-stat="trades"` | ✅ Fetched | ✅ Fixed (was 14,567) |

### Strategy Cards (Backtest Data — INTENTIONALLY HARDCODED)
| Data Point | Value | Notes |
|-----------|-------|-------|
| FVG+IFVG win rate | 76.63% | Backtest value — correct |
| FVG+IFVG net profit | +$60,000 | Backtest value — correct |
| OTE Silver Bullet win rate | 62.63% | Backtest value — correct |
| OTE Silver Bullet net profit | +$74,000 | Backtest value — correct |
| OTE Refined Large win rate | 69.08% | Backtest value — correct |
| OTE Refined Large net profit | +$192,000 | Backtest value — correct |
| OTE Refined Small win rate | 69.08% | Backtest value — correct |
| OTE Refined Small net profit | +$46,000 | Backtest value — correct |
| "14,500+ trades verified" badge | — | Backtest count — acceptable |

### Bot Deployment Cards (HARDCODED — backtest/static values)
| Bot | Win Rate | Trades | Profit | Notes |
|-----|----------|--------|--------|-------|
| Technical Tina | 76.7% | 5,167 | +62% | ⚠️ Backtest data, not live |
| Diamond Hands Danny | 62.5% | 4,797 | +144% | ⚠️ Backtest data, not live |
| Algo Annie | 69.0% | 4,603 | +185% | ⚠️ Backtest data, not live |
| Moon Mission Mike | 62.5% | 4,797 | +144% | ⚠️ Backtest data, not live |

> **Note:** Bot card stats show BACKTEST performance, not live. This is intentional for marketing — the live data is in the terminal and dashboard. Could be improved by adding "Backtest" label or fetching live data.

### Other Sections
| Data Point | Status | Notes |
|-----------|--------|-------|
| "Four bots" in descriptions | ✅ Correct | Multiple references, all say 4 |
| "4 ICT strategies" in flow | ✅ Correct | |
| Revenue allocation (80/10/5/5) | ✅ Correct | Hardcoded, intentional |
| Token supply (1B) | ✅ Correct | Hardcoded, intentional |
| NFT character cards (6 shown) | ✅ Correct | Includes Rekt Riley as lore |
| No "Big Bot Bobby" references | ✅ Clean | |
| No "3 bots" references | ✅ Clean | |

### Dynamic Fetch Script
| What it updates | Selector | Status |
|----------------|----------|--------|
| AUM | `[data-stat="aum"]` | ✅ |
| Bot badge | `[data-stat="bots"]` | ✅ |
| Total trades | `[data-stat="trades"]` | ✅ |
| Bot count | `[data-stat="bots-count"]` | ✅ |
| Win rate | `[data-stat="winrate"]` | ✅ Added in audit |

---

## Page 2: Cipher City 3D Dashboard (city.html)

### HUD Top
| Data Point | Element ID | Dynamic? | Status |
|-----------|-----------|----------|--------|
| AUM | `#hud-aum-val` | ✅ API refresh (60s) | ✅ Correct |
| System status | `#sys-status` | ✅ API refresh | ✅ Correct |
| Status dot color | `#sys-dot` | ✅ API refresh | ✅ Correct |

### HUD Bottom
| Data Point | Status | Notes |
|-----------|--------|-------|
| Title | ✅ Fixed | Was "$9,000 Profit Target", now "Progress Tracker" |
| Progress bars (4 bots) | ✅ Dynamic | Calculates from bot data |
| Legend | ✅ Fixed | Was missing Mike, now shows all 4 |

### Bot Data (Initial/Fallback Values)
| Bot | Balance | P&L | Win Rate | Trades | Status |
|-----|---------|-----|----------|--------|--------|
| Tina | $147,245.18 | -$2,754.82 | 76.5% | 5,202 | ✅ Matches API |
| Danny | $152,419.30 | +$2,419.30 | 100% | 1 | ✅ Fixed (was 62.6%, 195) |
| Annie | $152,383.88 | +$2,383.88 | 100% | 1 | ✅ Fixed (was 69.1%, 214) |
| Mike | $303,042.06 | +$3,042.06 | 0% | 0 | ✅ Matches API |

### Detail Panel
| Data Point | Status | Notes |
|-----------|--------|-------|
| Funded start/target labels | ✅ Fixed | Now dynamic per bot (150K→159K or 300K→320K) |
| Drawdown display | ✅ Correct | |
| Bot status badge | ✅ Correct | |

### 3D Scene
| Element | Status | Notes |
|---------|--------|-------|
| 4 bot workstations | ✅ Correct | All 4 present |
| Graveyard (Rekt Riley) | ✅ Correct | 1 named tombstone + 3 empty |
| Jimmy figure | ✅ Correct | |
| Central tower | ✅ Correct | |

### API Integration
| Feature | Status | Notes |
|---------|--------|-------|
| Fetches `/api/dashboard` | ✅ | Every 60s |
| Updates bot balances | ✅ | |
| Updates bot status | ✅ | |
| Updates HUD AUM | ✅ | |
| Recalculates drawdown | ✅ | |
| Re-renders bot screens | ✅ | |

---

## Page 3: Admin Mission Control (caretaker/dashboard/index.html)

### Header Stats
| Stat | Element ID | Dynamic? | Status |
|------|-----------|----------|--------|
| Total AUM | `#stat-aum` | ✅ /api/accounts | ✅ |
| Active Bots | `#stat-bots` | ✅ /api/accounts | ✅ |
| "Across X accounts" | `#stat-bots-change` | ⚠️ Static | ✅ Fixed (was "3", now "4") |
| Today's P&L | `#stat-pnl` | ✅ /api/accounts | ✅ |
| Signals (24h) | `#stat-signals` | ✅ /api/signals | ✅ |

### Bot Performance Cards (Decrypt Labs Tab)
| Feature | Status | Notes |
|---------|--------|-------|
| All 4 bots defined in BOTS array | ✅ | Tina, Danny, Annie, Mike |
| Balance per bot | ✅ Dynamic | From /api/accounts |
| Today's P&L per bot | ✅ Dynamic | |
| Progress to funded | ✅ Dynamic | Correct targets (159K/320K) |
| Trailing drawdown gauge | ✅ Dynamic | Correct max ($5K/$7.5K) |
| Win rate | ✅ Dynamic | |
| Total trades | ✅ Dynamic | |
| Mini chart | ⚠️ Random | Decorative, not real data |

### Other Sections
| Section | Status | Notes |
|---------|--------|-------|
| Expenses table | ✅ | Editable, saves to API |
| Signals feed | ✅ | Auto-refresh 30s |
| Org chart | ✅ | Correct team structure |
| Kanban board | ✅ | Static task data |
| Calendar | ✅ | Correct macro times |
| Access control | ✅ | Wallet scanner ready |
| Buyback tracker | ✅ | Placeholder (pre-launch) |
| No "Big Bot Bobby" refs | ✅ Clean | |
| No "3 bots" refs | ✅ Fixed | Was "Across 3 accounts" |

---

## Data Flow

```
Tradovate Scrape → POST /api/balances → data.json updates →
  → Landing page fetches /api/site-config (on page load)
  → Cipher City fetches /api/dashboard (every 60s)
  → Admin MC fetches /api/accounts + /api/signals + /api/stats (every 30s)
```

## API Endpoints

| Endpoint | Method | Used By | Description |
|----------|--------|---------|-------------|
| `/api/site-config` | GET | Landing page | Centralized config (all stats + bots) |
| `/api/dashboard` | GET | Cipher City | Full data.json dump |
| `/api/accounts` | GET | Admin MC | Per-bot account details |
| `/api/balances` | POST | Scraper | Update balances from Tradovate |
| `/api/data` | PUT | Admin | Full data.json replacement |
| `/api/signals` | GET | Admin MC | Recent webhook signals |
| `/api/stats` | GET | Admin MC | Aggregated stats |
| `/api/expenses` | GET/POST | Admin MC | Expense tracking |

## Issues Fixed in This Audit (2026-02-09)

1. **Landing page**: Win rate was hardcoded `69.4%` → Now dynamic via `data-stat="winrate"` with weighted average
2. **Landing page**: Total trades initial value was `14,567` → Corrected to `5,204` (fetched from API)
3. **Cipher City**: Danny win rate `62.6%` → `100%` (matches API - only 1 trade)
4. **Cipher City**: Annie win rate `69.1%` → `100%` (matches API - only 1 trade)
5. **Cipher City**: Danny trades `195` → `1` (matches API)
6. **Cipher City**: Annie trades `214` → `1` (matches API)
7. **Cipher City**: Tina drawdownPct `58.6%` → `55.3%` (recalculated from API)
8. **Cipher City**: Tina trades `268` → `5,202` (matches API)
9. **Cipher City**: HUD bottom title "Road to Funded — $9,000 Profit Target" → "Road to Funded — Progress Tracker" (Mike has different target)
10. **Cipher City**: Legend was missing Mike → Added Moon Mission Mike with color swatch
11. **Cipher City**: Detail panel funded labels hardcoded $150K→$159K → Now dynamic per bot account size
12. **Admin MC**: "Across 3 accounts" → "Across 4 accounts"

## ⚠️ Still Needs Attention

| Item | Page | Issue | Priority |
|------|------|-------|----------|
| Racing scores missing Mike | API/City | `new-300k` not in racing.daily/weekly/monthly/allTime scores | Medium |
| Mini charts decorative | Admin MC | Bot card charts are random, not real trade data | Low |
| Bot card stats hardcoded | Landing | Deployment card win rates/trades are backtest, not live | Low (intentional for now) |
| `stat-bots-change` static | Admin MC | "Across 4 accounts" is static text, not dynamic count | Low |
| Kanban board static | Admin MC | Task board doesn't pull from TODO.md or any API | Low |
| Buyback tracker placeholder | Admin MC | Pre-launch, no real data yet | Low (expected) |

---

## Known Acceptable Hardcoded Values

These are intentionally hardcoded and should NOT be made dynamic:
- Strategy card backtest stats (historical data, doesn't change)
- Bot deployment card backtest stats (marketing/historical)
- Token supply and distribution (fixed)
- Revenue allocation percentages (fixed)
- NFT collection info (fixed)
- Team org chart (rarely changes)

## Adding a New Bot
1. Add bot entry to data.json (via PUT /api/data)
2. Add bot to BOTS array in admin dashboard index.html
3. Add bot to bots array in city.html
4. Add bot card HTML in landing page index.html
5. Add to legend in city.html HUD bottom
6. Deploy: `railway up` + `wrangler pages deploy`
