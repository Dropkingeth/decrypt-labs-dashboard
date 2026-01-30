# 🤖 Caretaker Auto-Start Setup

Auto-start the Trade Caretaker on macOS boot.

## What Gets Started
1. **Caretaker Server** (port 3458) — webhook receiver + monitoring
2. **ngrok Tunnel** — public URL for TradingView webhooks
3. **Clawdbot Browser** — for Tradovate position verification

## Quick Install

```bash
# Run the install script
./install.sh
```

## Manual Install

1. Copy the plist files to LaunchAgents:
```bash
cp com.decryptlabs.caretaker.plist ~/Library/LaunchAgents/
cp com.decryptlabs.ngrok.plist ~/Library/LaunchAgents/
```

2. Load them:
```bash
launchctl load ~/Library/LaunchAgents/com.decryptlabs.caretaker.plist
launchctl load ~/Library/LaunchAgents/com.decryptlabs.ngrok.plist
```

## Commands

```bash
# Check status
launchctl list | grep decryptlabs

# Stop services
launchctl unload ~/Library/LaunchAgents/com.decryptlabs.caretaker.plist
launchctl unload ~/Library/LaunchAgents/com.decryptlabs.ngrok.plist

# View logs
tail -f /tmp/caretaker.log
tail -f /tmp/ngrok.log

# Restart
launchctl kickstart -k gui/$(id -u)/com.decryptlabs.caretaker
```

## After Reboot Checklist
- [ ] Verify ngrok URL: `curl -s http://localhost:4040/api/tunnels`
- [ ] Check Caretaker: `curl -s http://localhost:3458/`
- [ ] Open Tradovate in Clawdbot browser
- [ ] Login if session expired

## Troubleshooting

**Services not starting?**
- Check logs in `/tmp/caretaker.log` and `/tmp/ngrok.log`
- Make sure node is in PATH

**ngrok URL changed?**
- Free ngrok URLs change on restart
- Update TradingView webhook URLs
- Or upgrade to ngrok paid for static subdomain (you have this!)

**Tradovate logged out?**
- Sessions expire — just log back in via Clawdbot browser
