# 🏙️ Cipher City — Mission Control Revamp

## Concept
Replace the data-heavy dashboard with a visual **Cipher City** environment where bots "live" and work. Users explore the city to understand bot performance instead of reading raw numbers.

## Architecture

### Zones
1. **The Workplace** — Where active bots trade. Each bot has a desk/workstation showing their live data
2. **The Graveyard** — Where dead/flagged bots rest (Rekt Riley). Tombstones with cause of death
3. **Quick Overview Bar** — Below the city, a simplified "Road to Funded" progress section

### Bot Workstations (Clickable)
When user clicks a bot, a panel slides out showing:
- **AUM** (currentBalance)
- **P&L** (netPnl, todayPnl)  
- **Win Rate** (winRate)
- **Total Trades** (totalTrades)
- **Drawdown** (drawdownUsed / drawdownMax with visual meter)
- **Progress to Funded** (profitTargetPercent)
- **Status** (evaluating/funded/paused)
- **NFT Character** (image from IPFS)

### Data Source
**Caretaker API:** `https://decrypt-caretaker-production.up.railway.app`

Available endpoints:
- `GET /api/dashboard` — Full dashboard data (bots, AUM, NFTs, stats)
- `GET /api/accounts` — Account balances, drawdown, progress
- `GET /api/trades?limit=N&bot=X` — Trade history
- `GET /api/stats` — Aggregate stats
- `GET /api/positions` — Open positions
- `GET /api/signals` — Recent signals

### Data Points Per Bot (from /api/dashboard)
```json
{
  "name": "Technical Tina",
  "subtitle": "FVG+IFVG • Determining Order Flow",
  "status": "online",
  "currentBalance": 147412.64,
  "strategy": "FVG + IFVG",
  "nft": { "id": 13, "name": "Technical Tina", "image": "IPFS_URL" },
  "stats": { "power": 75, "fuel": 100, "condition": 85, "heat": 25 },
  "performance": { "totalTrades": 5202, "winRate": 76.5, "netPnl": -2587.36, "todayPnl": -66.48 },
  "eval": {
    "status": "evaluating",
    "profitTarget": -2587.36,
    "profitTargetGoal": 9000,
    "drawdownUsed": 2764.88,
    "drawdownMax": 5000,
    "drawdownPercent": 55.3
  }
}
```

### Active Bots
| Bot | NFT | Strategy | Status |
|-----|-----|----------|--------|
| Technical Tina (#13) | FVG+IFVG | Evaluating | ⚠️ 55% DD |
| Diamond Hands Danny (#01) | OTE Silver Bullet | Evaluating | ✅ Healthy |
| Algo Annie (#05) | OTE Refined Small | Evaluating | ✅ Healthy |

### Graveyard Residents
| Bot | NFT | Cause of Death |
|-----|-----|----------------|
| Rekt Riley (#10) | OTE Silver Bullet (Original) | Flagged by Apex — rapid entry/exit |

### NFT Integration
- 20 Cipher Bot characters exist on IPFS
- When someone mints, their character appears in the city
- Characters are pre-built, just hidden until minted
- NFT images: `https://gateway.pinata.cloud/ipfs/{CID}`

## Tech Stack
- Single HTML file (like index.html)
- CSS for the city visuals (isometric/simple art style)
- Vanilla JS for API calls and interactivity
- No external dependencies beyond Google Fonts
- Responsive (mobile: stack vertically)

## Build Order
1. **Phase 1: Data Layer** — Fetch from API, structure bot objects
2. **Phase 2: City Base** — Simple visual layout with bot workstations
3. **Phase 3: Click Interactions** — Bot detail panels
4. **Phase 4: Graveyard** — Dead bot zone
5. **Phase 5: NFT Integration** — Character appearances
6. **Phase 6: Quick Overview** — Road to Funded bar below city

## Art Style
- Simple, clean, cyberpunk-lite
- Dark background with neon accents (matches landing page)
- CSS-only illustrations (no heavy assets)
- Isometric or top-down perspective for the city
- Bot characters represented by their NFT images in circular frames
- Glowing workstations with subtle animations
