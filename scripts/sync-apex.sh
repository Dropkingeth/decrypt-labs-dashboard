#!/bin/bash
# ============================================================
# Decrypt Labs - Apex Account Sync
# ============================================================
# Syncs account data from Apex to Railway API
# Run manually or via cron/heartbeat
# ============================================================

API_URL="https://stunning-appreciation-production-ea66.up.railway.app"

# Account data - Update these values when scraped
# Format: JSON payload for /api/accounts endpoint

read -r -d '' ACCOUNTS_DATA << 'EOF'
{
  "ote-silver-bullet": {
    "accountId": "APEX-251912-14",
    "name": "OTE Silver Bullet",
    "product": "150k Tradovate",
    "pnl": 1958,
    "balance": 151958,
    "target": 159000,
    "drawdown": 0,
    "drawdownMax": 6000,
    "days": 33,
    "status": "Active"
  },
  "fvg-ifvg": {
    "accountId": "APEX-251912-18",
    "name": "FVG+IFVG",
    "product": "150k Tradovate",
    "pnl": 17,
    "balance": 150017,
    "target": 159000,
    "drawdown": 0,
    "drawdownMax": 6000,
    "days": 16,
    "status": "Active"
  }
}
EOF

echo "🔄 Syncing Apex accounts to Railway API..."
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}/api/accounts" \
  -H "Content-Type: application/json" \
  -d "$ACCOUNTS_DATA")

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Accounts synced successfully!"
  echo "$RESPONSE" | jq .
else
  echo "❌ Sync failed!"
  echo "$RESPONSE"
  exit 1
fi
