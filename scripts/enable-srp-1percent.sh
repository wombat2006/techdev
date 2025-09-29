#!/bin/bash

# Extremely careful 1% SRP test activation
# 極めて慎重な1%SRPテスト有効化

echo "🚨 CAUTION: Enabling 1% SRP traffic for testing"
echo "📊 This will affect only 1% of wall-bounce requests"
echo "⏰ Starting in 10 seconds... Press Ctrl+C to cancel"

# Countdown
for i in {10..1}; do
    echo "Starting in $i seconds..."
    sleep 1
done

echo ""
echo "🔧 Setting SRP configuration for 1% test..."

# Create test configuration
cat > .env.srp-1percent-test << EOF
# SRP 1% Test Configuration - $(date)
USE_SRP_WALL_BOUNCE=true
SRP_MIGRATION_PHASE=pilot
SRP_TRAFFIC_PERCENTAGE=1

# Safety measures
ENABLE_SRP_ROLLBACK=true
MONITOR_SRP_PERFORMANCE=true
ENABLE_SRP_DEBUG_LOGS=true

# Monitoring
LOG_LEVEL=info
EOF

echo "✅ Configuration created: .env.srp-1percent-test"
echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo "1. Review the configuration file above"
echo "2. Copy to .env: cp .env.srp-1percent-test .env"
echo "3. Restart the service: npm start"
echo "4. Start monitoring: node scripts/monitor-srp-production.js"
echo "5. Watch logs carefully for 10 minutes"
echo ""
echo "🚨 EMERGENCY ROLLBACK:"
echo "   Set USE_SRP_WALL_BOUNCE=false in .env and restart"
echo ""
echo "⚠️  DO NOT PROCEED without team approval and monitoring setup"