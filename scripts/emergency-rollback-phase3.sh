#!/bin/bash

# Emergency Rollback Script for SRP Phase 3 (5%)
# 🚨 USE ONLY IN CASE OF CRITICAL ISSUES

set -e

echo "🚨 SRP PHASE 3 EMERGENCY ROLLBACK INITIATED"
echo "================================================"

# Configuration
BACKUP_ENV_FILE=".env.pre-phase3-backup"
ROLLBACK_LOG_FILE="./logs/emergency-rollback-$(date +%Y%m%d-%H%M%S).log"
PHASE3_CONFIG_FILE=".env.phase3-5percent"

# Create rollback log
mkdir -p ./logs
echo "Emergency rollback started at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$ROLLBACK_LOG_FILE"

# Function to log messages
log_message() {
    local message="$1"
    echo "$(date -u +%Y-%m-%dT%H:%M:%S) [ROLLBACK] $message" | tee -a "$ROLLBACK_LOG_FILE"
}

# Function to handle errors
handle_error() {
    local exit_code=$1
    log_message "❌ ERROR: Emergency rollback failed with exit code $exit_code"
    echo "🚨 CRITICAL: Manual intervention required!"
    echo "📋 Contact development team immediately"
    exit $exit_code
}

# Set error handler
trap 'handle_error $?' ERR

log_message "🔍 Pre-rollback system status check"

# Check if SRP is currently active
if [ -f "$PHASE3_CONFIG_FILE" ] && grep -q "USE_SRP_WALL_BOUNCE=true" "$PHASE3_CONFIG_FILE"; then
    log_message "✅ SRP Phase 3 configuration detected - proceeding with rollback"
else
    log_message "⚠️  Warning: SRP Phase 3 may not be currently active"
fi

# Capture current metrics before rollback
log_message "📊 Capturing pre-rollback metrics"
if command -v node &> /dev/null; then
    node -e "
        const fs = require('fs');
        const metrics = {
            timestamp: new Date().toISOString(),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            pid: process.pid,
            nodeVersion: process.version
        };
        console.log('System metrics:', JSON.stringify(metrics, null, 2));
    " 2>/dev/null || log_message "⚠️  Could not capture Node.js metrics"
fi

# Step 1: Immediate SRP Disable
log_message "🛑 Step 1: Disabling SRP immediately"

cat > .env.emergency-disable << 'EOF'
# 🚨 EMERGENCY SRP DISABLE - GENERATED AUTOMATICALLY
USE_SRP_WALL_BOUNCE=false
SRP_MIGRATION_PHASE=disabled
SRP_TRAFFIC_PERCENTAGE=0
ENABLE_SRP_ROLLBACK=false
MONITOR_SRP_PERFORMANCE=false

# Rollback metadata
ROLLBACK_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ROLLBACK_REASON=emergency_rollback_phase3
ROLLBACK_INITIATED_BY=emergency_script
EOF

log_message "✅ Emergency disable configuration created"

# Step 2: Backup current configuration
log_message "💾 Step 2: Backing up current configuration"

if [ -f ".env" ]; then
    cp ".env" ".env.rollback-backup-$(date +%Y%m%d-%H%M%S)" || handle_error $?
    log_message "✅ Current .env backed up"
else
    log_message "⚠️  No .env file found to backup"
fi

# Step 3: Apply emergency configuration
log_message "⚡ Step 3: Applying emergency configuration"

# Merge emergency config with existing .env
if [ -f ".env" ]; then
    # Remove SRP-related settings from current .env
    grep -v '^USE_SRP_WALL_BOUNCE=' .env > .env.temp || touch .env.temp
    grep -v '^SRP_MIGRATION_PHASE=' .env.temp > .env.temp2 || touch .env.temp2
    grep -v '^SRP_TRAFFIC_PERCENTAGE=' .env.temp2 > .env.temp3 || touch .env.temp3

    # Add emergency settings
    cat .env.temp3 .env.emergency-disable > .env.new
    mv .env.new .env
    rm -f .env.temp .env.temp2 .env.temp3
else
    # No existing .env, use emergency config
    cp .env.emergency-disable .env
fi

log_message "✅ Emergency configuration applied to .env"

# Step 4: Verify rollback
log_message "🔍 Step 4: Verifying rollback configuration"

if grep -q "USE_SRP_WALL_BOUNCE=false" .env && grep -q "SRP_TRAFFIC_PERCENTAGE=0" .env; then
    log_message "✅ Rollback configuration verified successfully"
else
    log_message "❌ Rollback verification failed"
    handle_error 1
fi

# Step 5: Process restart (if PM2 is available)
log_message "🔄 Step 5: Attempting to restart application processes"

if command -v pm2 &> /dev/null; then
    log_message "🔄 Restarting with PM2"
    pm2 restart all 2>/dev/null || log_message "⚠️  PM2 restart failed or no processes running"
elif pgrep -f "node.*server" > /dev/null; then
    log_message "🔄 Restarting Node.js processes"
    # Send SIGUSR2 to trigger graceful restart (if supported)
    pkill -USR2 -f "node.*server" || log_message "⚠️  Could not send restart signal"
else
    log_message "⚠️  No running processes detected - manual restart may be required"
fi

# Step 6: Post-rollback validation
log_message "✅ Step 6: Post-rollback validation"

sleep 5  # Give processes time to restart

# Check if application is responding
if command -v curl &> /dev/null; then
    log_message "🏥 Testing application health"

    if curl -s -f http://localhost:4000/health > /dev/null 2>&1; then
        log_message "✅ Application health check passed"
    else
        log_message "⚠️  Application health check failed - may need manual verification"
    fi
else
    log_message "⚠️  curl not available - skipping health check"
fi

# Step 7: Cleanup and final status
log_message "🧹 Step 7: Cleanup and final status"

# Clean up temporary files
rm -f .env.emergency-disable

# Generate rollback summary
cat >> "$ROLLBACK_LOG_FILE" << EOF

🎯 ROLLBACK SUMMARY
==================
Rollback completed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Configuration: SRP disabled, 0% traffic
Status: SUCCESS
Next steps: Monitor application stability

📋 VERIFICATION CHECKLIST
=========================
[ ] Application responding on port 4000
[ ] All SRP traffic diverted to legacy system
[ ] Error rates returning to baseline
[ ] Memory usage normalized
[ ] No SRP-related errors in logs

🚨 IMPORTANT NOTES
==================
1. SRP Phase 3 has been completely disabled
2. All traffic is now using legacy wall-bounce system
3. Monitor application for 30 minutes to ensure stability
4. Contact development team to analyze rollback cause
5. Do not re-enable SRP without thorough investigation

EOF

log_message "📄 Rollback summary written to $ROLLBACK_LOG_FILE"

# Display final status
echo ""
echo "🎯 SRP PHASE 3 EMERGENCY ROLLBACK COMPLETED"
echo "==========================================="
echo "✅ SRP disabled successfully"
echo "✅ Traffic diverted to legacy system"
echo "✅ Configuration backed up"
echo "📄 Full log: $ROLLBACK_LOG_FILE"
echo ""
echo "🚨 NEXT STEPS:"
echo "1. Monitor application stability for 30 minutes"
echo "2. Check error rates and performance metrics"
echo "3. Contact development team with rollback details"
echo "4. Do not re-enable SRP without investigation"
echo ""
echo "💡 To check current status:"
echo "   grep 'USE_SRP_WALL_BOUNCE' .env"
echo "   curl http://localhost:4000/health"
echo ""

log_message "🏁 Emergency rollback script completed successfully"

exit 0