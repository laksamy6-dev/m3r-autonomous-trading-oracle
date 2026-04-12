#!/bin/bash
# Kill any existing tunnels
pkill cloudflared 2>/dev/null
sleep 2

# Start new tunnel in background
echo "Starting Cloudflare Tunnel..."
nohup cloudflared tunnel --url http://localhost:5000 > tunnel.log 2>&1 &

# Wait for URL
sleep 5

# Get and display the URL
URL=$(grep -o "https://[a-z-]*\.trycloudflare\.com" tunnel.log | head -1)
echo ""
echo "🌐 TUNNEL URL: $URL"
echo ""
echo "Access your app at:"
echo "  📱 App: $URL/index.html"
echo "  📊 Dashboard: $URL/live.html"
echo ""
echo "To stop tunnel: pkill cloudflared"
echo "To check logs: tail -f tunnel.log"
