#!/bin/bash
# m3r-monitor.sh - Continuous monitoring for errors

LOG_FILE="$HOME/m3r-autonomous-trading-oracle/logs/errors/error.log"
ALERT_FILE="$HOME/m3r-autonomous-trading-oracle/logs/critical-alerts.log"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$ALERT_FILE")"

echo "🔍 Starting M3R Error Monitor..."
echo "Monitoring: $LOG_FILE"
echo "Alerts will be saved to: $ALERT_FILE"

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Monitor for critical errors in real-time
tail -n 0 -f "$LOG_FILE" | while read line; do
    # Check for critical patterns
    if echo "$line" | grep -qE "CRITICAL|FATAL|Error:.*Cannot|Database.*fail|Connection.*refused|VAULT.*FAIL|Transform failed|SyntaxError"; then
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        echo "$TIMESTAMP ALERT: $line" >> "$ALERT_FILE"
        echo "🚨 CRITICAL ERROR DETECTED: $line"
        
        # Send Telegram alert if configured
        if [ -f .env ]; then
            TELEGRAM_CHAT=$(grep TELEGRAM_CHAT_ID .env | cut -d= -f2 | head -1)
            TELEGRAM_BOT=$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2 | head -1)
            if [ ! -z "$TELEGRAM_CHAT" ] && [ ! -z "$TELEGRAM_BOT" ] && [ "$TELEGRAM_BOT" != "your_telegram_bot_token_here" ]; then
                curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage" \
                    -d "chat_id=${TELEGRAM_CHAT}" \
                    -d "text=🚨 M3R CRITICAL ERROR: ${line:0:200}" 2>/dev/null || true
            fi
        fi
    fi
done
