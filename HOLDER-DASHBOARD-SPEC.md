# Holder Dashboard Spec

*Created: 2026-02-03*

---

## 🎯 Overview

When a user mints a Decrypt Labs NFT, they get:
1. A unique bot identity (NFT character + name)
2. Access to a personalized dashboard
3. Their NFT displayed in bot telemetry
4. Their bot tracked in "Road to Funded" by NFT name

---

## 🔄 User Flow

```
1. User connects wallet on mint page
2. User mints NFT (e.g., "Shadow Nexus #42")
3. NFT maps to a bot slot (OTE or FVG strategy)
4. User redirected to /dashboard/holder
5. Dashboard shows ONLY their bot(s)
6. Bot telemetry displays their NFT image + name
7. Road to Funded shows their progress by NFT name
```

---

## 📦 Components to Build

### 1. Wallet Connection (mint page + dashboard)
- [ ] Add Web3 provider (ethers.js or wagmi)
- [ ] "Connect Wallet" button
- [ ] Support MetaMask + WalletConnect
- [ ] Store connected address in session

### 2. NFT Ownership Check
- [ ] Query BotNFT contract for user's tokens
- [ ] Get token IDs owned by connected wallet
- [ ] Fetch metadata for each token (name, image, attributes)

### 3. NFT → Bot Mapping
```javascript
// Each NFT maps to a bot config
{
  tokenId: 42,
  name: "Shadow Nexus",
  image: "ipfs://...",
  strategy: "ote-silver-bullet", // or "fvg-ifvg"
  accountId: "BOT-ALPHA",
  mintedAt: "2026-02-03T12:00:00Z"
}
```

### 4. Holder Dashboard (`/dashboard/holder`)
**Layout:**
```
┌─────────────────────────────────────────────────┐
│  🔐 Connected: 0x1234...5678    [Disconnect]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  YOUR BOTS                                      │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  [NFT IMAGE]                             │   │
│  │                                          │   │
│  │  Shadow Nexus #42                        │   │
│  │  Strategy: OTE Silver Bullet             │   │
│  │                                          │   │
│  │  Balance:     $149,200                   │   │
│  │  P&L:         -$800 (-0.53%)             │   │
│  │  Drawdown:    $800 / $5,000 (16%)        │   │
│  │  To Funded:   $9,800 remaining           │   │
│  │                                          │   │
│  │  [████████░░░░░░░░░░░░] 18% to goal      │   │
│  │                                          │   │
│  │  Status: ⏸️ PAUSED                       │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  RECENT TRADES                                  │
│  ─────────────────────────────────────────────  │
│  │ 02/03 10:43 AM │ LONG  │ +$45.50 │ ✅      │  │
│  │ 02/03 09:52 AM │ SHORT │ -$22.00 │ ❌      │  │
│  │ ...                                       │  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 5. Bot Telemetry Updates
**Current:**
```
OTE Silver Bullet
Balance: $149,200
```

**New (with NFT):**
```
┌─────────────────────────┐
│  [NFT IMAGE]            │
│  Shadow Nexus #42       │
│  OTE Silver Bullet      │
│  Balance: $149,200      │
│  Owner: 0x1234...5678   │
└─────────────────────────┘
```

### 6. Road to Funded Updates
**Current:**
```
OTE Silver Bullet ████████░░░░ 33%
FVG+IFVG         ██░░░░░░░░░░ 8%
```

**New (with NFT names):**
```
Shadow Nexus #42      ████████░░░░ 33%  (OTE)
Cipher Prime #7       ██░░░░░░░░░░ 8%   (FVG)
Void Runner #19       █████░░░░░░░ 22%  (OTE)
```

---

## 🗄️ Data Structure

### NFT Metadata (on IPFS)
```json
{
  "name": "Shadow Nexus #42",
  "description": "Decrypt Labs Trading Bot NFT",
  "image": "ipfs://Qm.../42.png",
  "attributes": [
    { "trait_type": "Strategy", "value": "OTE Silver Bullet" },
    { "trait_type": "Tier", "value": "Genesis" },
    { "trait_type": "Rarity", "value": "Rare" }
  ]
}
```

### Caretaker API Updates
```
GET /api/holder/:walletAddress
→ Returns all bots owned by this wallet

GET /api/bot/:tokenId
→ Returns detailed stats for specific NFT/bot

POST /api/bot/:tokenId/link
→ Links NFT to trading account (admin only)
```

---

## 🏗️ Implementation Order

### Phase 1: Wallet + Ownership
1. Add wallet connection to mint page
2. Add wallet connection to dashboard
3. Query NFT ownership from contract
4. Display owned NFTs

### Phase 2: Holder Dashboard
1. Create `/dashboard/holder` page
2. Show NFT cards with bot stats
3. Pull live data from Caretaker API
4. Add detailed drawdown/progress stats

### Phase 3: Telemetry Integration
1. Update bot telemetry to show NFT image/name
2. Update Road to Funded with NFT names
3. Add owner address display (truncated)

### Phase 4: Mint → Dashboard Flow
1. After successful mint, redirect to holder dashboard
2. Show "Congratulations" modal with NFT
3. Auto-refresh to show new bot

---

## 🔧 Tech Stack

- **Wallet:** ethers.js v6 or wagmi v2
- **Chain:** Base (mainnet) / Base Sepolia (testnet)
- **NFT Contract:** BotNFT (already deployed)
- **API:** Caretaker (Railway)
- **Frontend:** Vanilla JS (existing) or upgrade to React

---

## ❓ Questions for DropKing

1. **Multiple NFTs per wallet?** Can one user mint multiple bots?
2. **Strategy assignment:** Does user choose strategy at mint, or random?
3. **Bot naming:** Use NFT collection names (Shadow Nexus, etc.) or let user name?
4. **Sharing:** Can users see other holders' bots, or only their own?
5. **Mainnet first?** Build for testnet then migrate, or go straight to mainnet?

---

## 📊 Current NFT Collection (20 Characters)

1. Shadow Nexus
2. Cipher Prime
3. Void Runner
4. Quantum Flux
5. Nova Strike
6. Dark Pulse
7. Neon Ghost
8. Steel Phantom
9. Crypto Sage
10. Bit Crusher
11. Hash Hunter
12. Chain Walker
13. Block Breaker
14. Token Titan
15. Mint Master
16. Gas Giant
17. Yield Yeti
18. Degen Dragon
19. Alpha Apex
20. Omega Oracle

---

*Ready to build! 🧪*
