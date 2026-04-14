#!/bin/bash
# m3r-stabilize-24-7.sh
# M3R Trading Oracle - Production Stabilization Script

set -e  # Exit on any error

echo "🚀 M3R TRADING ORACLE - 24/7 PRODUCTION STABILIZATION"
echo "======================================================"
date

cd ~/m3r-autonomous-trading-oracle

# ==========================================
# STEP 1: KILL ALL EXISTING PROCESSES (Clean Flush)
# ==========================================
echo ""
echo "🧹 STEP 1: KILLING ALL EXISTING PROCESSES..."

# Kill PM2 processes
pm2 kill 2>/dev/null || true

# Kill any hanging node processes on port 5000
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 5001/tcp 2>/dev/null || true

# Kill any tsx/node processes
pkill -f "tsx" 2>/dev/null || true
pkill -f "node.*m3r" 2>/dev/null || true
pkill -f "node.*index" 2>/dev/null || true

sleep 2

echo "✅ All processes terminated"

# ==========================================
# STEP 2: SYSTEM HEALTH CHECK
# ==========================================
echo ""
echo "🔍 STEP 2: SYSTEM HEALTH CHECK..."

# Check PostgreSQL
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL: RUNNING"
else
    echo "❌ PostgreSQL: NOT RUNNING - Starting..."
    sudo systemctl restart postgresql
    sleep 3
    sudo systemctl status postgresql --no-pager | head -5
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  WARNING: Disk usage at ${DISK_USAGE}% - Clean logs recommended"
    pm2 flush 2>/dev/null || true
    find ~/m3r-autonomous-trading-oracle/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
else
    echo "✅ Disk Space: ${DISK_USAGE}% used"
fi

# Check memory
MEM_AVAILABLE=$(free -m | awk 'NR==2{print $7}')
if [ "$MEM_AVAILABLE" -lt 500 ]; then
    echo "⚠️  WARNING: Low memory (${MEM_AVAILABLE}MB available)"
else
    echo "✅ Memory: ${MEM_AVAILABLE}MB available"
fi

# ==========================================
# STEP 3: DEPENDENCY VERIFICATION
# ==========================================
echo ""
echo "📦 STEP 3: VERIFYING DEPENDENCIES..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not installed!"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "✅ Node.js: $NODE_VERSION"

if ! command -v tsx &> /dev/null; then
    echo "⚠️  tsx not found globally - Installing..."
    npm install -g tsx
fi
echo "✅ tsx: Available"

if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 not found - Installing..."
    npm install -g pm2
fi
pm2 --version
echo "✅ PM2: Available"

# ==========================================
# STEP 4: VERIFY ENVIRONMENT CONFIGURATION
# ==========================================
echo ""
echo "⚙️  STEP 4: VERIFYING ENVIRONMENT..."

if [ ! -f .env ]; then
    echo "❌ .env file missing!"
    exit 1
fi

# Ensure live flags are set
grep -q "LIVE_MODE=true" .env || echo "LIVE_MODE=true" >> .env
grep -q "PAPER_TRADING=false" .env || echo "PAPER_TRADING=false" >> .env
grep -q "MOCK_DATA=false" .env || echo "MOCK_DATA=false" >> .env

echo "✅ Environment configured for LIVE mode"

# ==========================================
# STEP 5: CLEAR ALL CACHES & TEMP DATA
# ==========================================
echo ""
echo "🗑️  STEP 5: CLEARING CACHES..."

rm -rf node_modules/.cache 2>/dev/null || true
rm -f /tmp/m3r-*.tmp 2>/dev/null || true
rm -f /tmp/tsx-* 2>/dev/null || true
pm2 flush 2>/dev/null || true

echo "✅ Caches cleared"

# ==========================================
# STEP 6: VERIFY CODE INTEGRITY
# ==========================================
echo ""
echo "🔒 STEP 6: CODE INTEGRITY CHECK..."

if grep -q "paperTradingMode = true" server/routes.ts; then
    echo "❌ CRITICAL: paperTradingMode is TRUE - Fixing..."
    sed -i 's/paperTradingMode = true/paperTradingMode = false/' server/routes.ts
    echo "✅ Fixed paperTradingMode to FALSE"
else
    echo "✅ paperTradingMode is FALSE (LIVE MODE)"
fi

# Count debug statements
DEBUG_COUNT=$(grep -c "console.log" server/routes.ts || echo "0")
if [ "$DEBUG_COUNT" -gt 50 ]; then
    echo "⚠️  WARNING: $DEBUG_COUNT console.log statements found"
fi

# ==========================================
# STEP 7: CREATE LOGGING DIRECTORIES
# ==========================================
echo ""
echo "📝 STEP 7: SETTING UP LOGGING INFRASTRUCTURE..."

mkdir -p ~/m3r-autonomous-trading-oracle/logs
mkdir -p ~/m3r-autonomous-trading-oracle/logs/errors
mkdir -p ~/m3r-autonomous-trading-oracle/logs/trades
mkdir -p ~/m3r-autonomous-trading-oracle/logs/neural

chmod -R 755 ~/m3r-autonomous-trading-oracle/logs

echo "✅ Logging directories ready"

# ==========================================
# STEP 8: PM2 ECOSYSTEM CONFIGURATION
# ==========================================
echo ""
echo "⚡ STEP 8: CONFIGURING PM2 FOR 24/7 OPERATION..."

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'm3r-trading-oracle',
      script: './server/index.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      
      // 24/7 Production Settings
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging Configuration
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/errors/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Environment
      env: {
        NODE_ENV: 'production',
        TSX_TSCONFIG: './tsconfig.json'
      },
      
      // Auto-restart on failure
      autorestart: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      
      // Advanced restart policy
      exp_backoff_restart_delay: 100
    }
  ]
};
EOF

echo "✅ PM2 ecosystem configured"

# ==========================================
# STEP 9: START PRODUCTION INSTANCE
# ==========================================
echo ""
echo "🚀 STEP 9: STARTING M3R TRADING ORACLE (24/7 MODE)..."

pm2 start ecosystem.config.js

sleep 5

if pm2 describe m3r-trading-oracle > /dev/null 2>&1; then
    STATUS=$(pm2 status m3r-trading-oracle | grep m3r-trading-oracle | awk '{print $10}')
    if [ "$STATUS" = "online" ]; then
        echo "✅ M3R Trading Oracle is ONLINE"
    else
        echo "❌ Process status is $STATUS - Check logs"
        pm2 logs m3r-trading-oracle --lines 50
        exit 1
    fi
else
    echo "❌ Failed to start - Check error logs"
    exit 1
fi

# ==========================================
# STEP 10: HEALTH VERIFICATION
# ==========================================
echo ""
echo "🏥 STEP 10: HEALTH VERIFICATION..."

sleep 3

for i in 1 2 3; do
    HEALTH=$(curl -s http://localhost:5000/api/health 2>/dev/null || echo '{"status":"error"}')
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        echo "✅ Health Check: OK (Attempt $i)"
        break
    else
        echo "⚠️  Health Check: Waiting... (Attempt $i)"
        sleep 2
    fi
done

# ==========================================
# STEP 11: SETUP MONITORING HOOKS
# ==========================================
echo ""
echo "📊 STEP 11: CONFIGURING MONITORING..."

pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "✅ PM2 startup configured"

# ==========================================
# STEP 12: FINAL STATUS
# ==========================================
echo ""
echo "📈 STEP 12: CURRENT STATUS..."
echo "================================================"

pm2 list

echo ""
echo "🧠 LAMY Neural Status:"
curl -s http://localhost:5000/api/lamy/autonomy-status | python3 -m json.tool 2>/dev/null || echo "API not responding"

echo ""
echo "================================================"
echo "✅ M3R TRADING ORACLE IS NOW RUNNING 24/7 MODE"
echo "================================================"
echo ""
echo "📋 USEFUL COMMANDS:"
echo "  pm2 logs m3r-trading-oracle --lines 100    # View logs"
echo "  pm2 monit                                   # Real-time monitor"
echo "  pm2 restart m3r-trading-oracle              # Restart"
echo "  tail -f ~/m3r-autonomous-trading-oracle/logs/errors/error.log"
echo ""
date
