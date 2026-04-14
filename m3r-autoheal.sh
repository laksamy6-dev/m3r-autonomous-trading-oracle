#!/bin/bash
# m3r-autoheal.sh - Fixed Auto-healing script (Run via cron every minute)

cd ~/m3r-autonomous-trading-oracle

# Check if process exists in PM2
if ! pm2 describe m3r-trading-oracle > /dev/null 2>&1; then
    echo "$(date): Process not found in PM2 - Starting..."
    pm2 start ecosystem.config.js
    exit 0
fi

# Check if process is online (fixed extraction)
STATUS=$(pm2 status m3r-trading-oracle | grep m3r-trading-oracle | awk '{print $10}')
if [ "$STATUS" != "online" ]; then
    echo "$(date): Process status is '$STATUS' (not online) - Restarting..."
    pm2 restart m3r-trading-oracle
    exit 0
fi

# Check health endpoint
HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null || echo '{"status":"error"}')
if ! echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "$(date): Health check failed - Restarting..."
    pm2 restart m3r-trading-oracle
    exit 0
fi

# Check for memory leaks (restart if > 800MB)
# Get PID first, then check memory
PID=$(pm2 pid m3r-trading-oracle)
if [ ! -z "$PID" ] && [ -f /proc/$PID/status ]; then
    MEM_KB=$(grep VmRSS /proc/$PID/status | awk '{print $2}')
    MEM_MB=$((MEM_KB / 1024))
    if [ "$MEM_MB" -gt 800 ]; then
        echo "$(date): High memory usage detected (${MEM_MB}MB) - Graceful restart..."
        pm2 reload m3r-trading-oracle
        exit 0
    fi
fi

# Check PostgreSQL
if ! pg_isready -q 2>/dev/null; then
    echo "$(date): PostgreSQL not ready - Restarting DB..."
    sudo systemctl restart postgresql
    sleep 5
    pm2 restart m3r-trading-oracle
    exit 0
fi

echo "$(date): Health check passed - System nominal"
