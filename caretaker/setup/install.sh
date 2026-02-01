#!/bin/bash
# 🤖 Caretaker Auto-Start Installer

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

echo "🤖 Installing Caretaker Auto-Start..."
echo ""

# Create LaunchAgents directory if needed
mkdir -p "$LAUNCH_AGENTS"

# Find node path
NODE_PATH=$(which node)
NGROK_PATH=$(which ngrok)

echo "📍 Node: $NODE_PATH"
echo "📍 ngrok: $NGROK_PATH"
echo ""

# Update plist with correct node path
sed "s|/usr/local/bin/node|$NODE_PATH|g" "$SCRIPT_DIR/com.decryptlabs.caretaker.plist" > "$LAUNCH_AGENTS/com.decryptlabs.caretaker.plist"

# Update plist with correct ngrok path  
sed "s|/opt/homebrew/bin/ngrok|$NGROK_PATH|g" "$SCRIPT_DIR/com.decryptlabs.ngrok.plist" > "$LAUNCH_AGENTS/com.decryptlabs.ngrok.plist"

echo "✅ Copied plist files to $LAUNCH_AGENTS"

# Unload if already loaded (ignore errors)
launchctl unload "$LAUNCH_AGENTS/com.decryptlabs.caretaker.plist" 2>/dev/null || true
launchctl unload "$LAUNCH_AGENTS/com.decryptlabs.ngrok.plist" 2>/dev/null || true

# Load the services
launchctl load "$LAUNCH_AGENTS/com.decryptlabs.caretaker.plist"
launchctl load "$LAUNCH_AGENTS/com.decryptlabs.ngrok.plist"

echo "✅ Services loaded"
echo ""

# Wait for startup
sleep 3

# Check status
echo "📊 Status:"
echo ""

if launchctl list | grep -q "com.decryptlabs.caretaker"; then
    echo "✅ Caretaker: Running"
else
    echo "❌ Caretaker: Not running (check /tmp/caretaker.log)"
fi

if launchctl list | grep -q "com.decryptlabs.ngrok"; then
    echo "✅ ngrok: Running"
else
    echo "❌ ngrok: Not running (check /tmp/ngrok.log)"
fi

echo ""

# Get ngrok URL
sleep 2
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NGROK_URL" ]; then
    echo "🌐 Public URL: $NGROK_URL"
    echo ""
    echo "📋 Webhook Endpoints:"
    echo "   $NGROK_URL/webhook/ote-silver-bullet"
    echo "   $NGROK_URL/webhook/ote-refined"
    echo "   $NGROK_URL/webhook/ote-refined-small"
    echo "   $NGROK_URL/webhook/fvg-ifvg"
else
    echo "⚠️  Could not get ngrok URL (may still be starting)"
fi

echo ""
echo "🎉 Done! Services will auto-start on boot."
echo ""
echo "Commands:"
echo "  View logs:  tail -f /tmp/caretaker.log"
echo "  Stop:       launchctl unload ~/Library/LaunchAgents/com.decryptlabs.*.plist"
