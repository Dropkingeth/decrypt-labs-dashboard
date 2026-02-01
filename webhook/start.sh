#!/bin/bash
# ============================================================
# Decrypt Labs - Start Webhook Server
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🤖 Starting Decrypt Labs Webhook Server..."
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Start the server
node server.js
