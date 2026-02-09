#!/bin/bash
# ICT Pipeline Keepalive — checks every 60s, restarts if dead

while true; do
  # Check if FastAPI is running
  if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "$(date) — Server down, restarting..."
    cd ~/clawd/ideas/decrypt-labs/ict-ai-analyst
    nohup python3 main.py > /tmp/ict-server.log 2>&1 &
    sleep 3
  fi

  # Check if cloudflared tunnel is running
  if ! pgrep -f "cloudflared tunnel" > /dev/null 2>&1; then
    echo "$(date) — Tunnel down, restarting..."
    nohup cloudflared tunnel --url http://localhost:8000 > /tmp/cloudflared.log 2>&1 &
    sleep 5
    NEWURL=$(grep "trycloudflare.com" /tmp/cloudflared.log | grep -o "https://[^ |]*")
    echo "$(date) — New tunnel URL: $NEWURL"
    echo "$NEWURL" > /tmp/tunnel-url.txt
  fi

  sleep 60
done
