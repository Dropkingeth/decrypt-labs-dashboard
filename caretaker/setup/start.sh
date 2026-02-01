#!/bin/bash
# 🤖 Start Trade Caretaker (Interactive)

cd /Users/dropking/clawd/ideas/decrypt-labs/caretaker

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🤖 Trade Caretaker                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Kill existing if running
pkill -f "integrated-server.js" 2>/dev/null && echo "⏹  Stopped existing Caretaker" || true
pkill -f "ngrok http 3458" 2>/dev/null && echo "⏹  Stopped existing ngrok" || true
sleep 1

# Start Caretaker
echo "▶  Starting Caretaker server..."
node integrated-server.js &
CARETAKER_PID=$!
sleep 2

# Start ngrok
echo "▶  Starting ngrok tunnel..."
ngrok http 3458 > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok URL
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4)

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ CARETAKER RUNNING"
echo ""
echo "   Local:   http://localhost:3458"
echo "   Public:  $NGROK_URL"
echo ""
echo "   Webhooks:"
echo "   • $NGROK_URL/webhook/ote-silver-bullet"
echo "   • $NGROK_URL/webhook/ote-refined"
echo "   • $NGROK_URL/webhook/ote-refined-small"
echo "   • $NGROK_URL/webhook/fvg-ifvg"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop, or close this window."
echo ""

# Cleanup on exit
trap "pkill -f integrated-server.js; pkill -f 'ngrok http 3458'; echo ''; echo '⏹  Caretaker stopped.'; exit" SIGINT SIGTERM

# Keep alive
wait $CARETAKER_PID
