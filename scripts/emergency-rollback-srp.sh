#!/bin/bash

# EMERGENCY SRP ROLLBACK SCRIPT
# 緊急時のSRP無効化とロールバック

echo "🚨 EMERGENCY SRP ROLLBACK INITIATED"
echo "⏰ $(date)"

# Immediate SRP disable
echo "🔧 Disabling SRP architecture immediately..."

# Create emergency configuration
cat > .env.emergency-rollback << EOF
# EMERGENCY ROLLBACK - $(date)
USE_SRP_WALL_BOUNCE=false
SRP_MIGRATION_PHASE=disabled
SRP_TRAFFIC_PERCENTAGE=0

# Ensure legacy mode
ENABLE_SRP_ROLLBACK=true
MONITOR_SRP_PERFORMANCE=false
ENABLE_SRP_DEBUG_LOGS=false

# Logging
LOG_LEVEL=error
EOF

# Backup current configuration
if [ -f ".env" ]; then
    cp .env ".env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Current .env backed up"
fi

# Apply emergency configuration
cp .env.emergency-rollback .env
echo "✅ Emergency configuration applied"

echo ""
echo "🚨 EMERGENCY ROLLBACK COMPLETED"
echo "📋 NEXT STEPS:"
echo "1. Restart the service immediately: npm start"
echo "2. Verify legacy mode: check logs for 'Legacy Wall-Bounce'"
echo "3. Monitor error rates and performance"
echo "4. Notify team of rollback completion"
echo ""
echo "📊 To check status:"
echo "   node -e \"console.log(require('./dist/config/feature-flags.js').featureFlags)\""
echo ""
echo "⚠️  Service restart is REQUIRED for changes to take effect"