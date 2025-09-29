#!/bin/bash
# TechSapo Real-time Development to Production Watcher

set -e

DEV_DIR="/ai/prj/techdev"
DEPLOY_SCRIPT="$DEV_DIR/scripts/deploy-to-prod.sh"
DEBOUNCE_SECONDS=3
LAST_DEPLOY=0

echo "👀 Starting TechSapo real-time deployment watcher..."
echo "   Development directory: $DEV_DIR"
echo "   Debounce delay: ${DEBOUNCE_SECONDS}s"
echo "   Press Ctrl+C to stop"
echo ""

# Check if inotify-tools is available
if ! command -v inotifywait &> /dev/null; then
    echo "⚠️  inotifywait not found. Installing inotify-tools..."
    if command -v dnf &> /dev/null; then
        sudo dnf install -y inotify-tools
    elif command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y inotify-tools
    else
        echo "❌ Cannot install inotify-tools automatically"
        echo "   Please install inotify-tools manually and run this script again"
        exit 1
    fi
fi

# Function to perform deployment with debouncing
deploy_if_needed() {
    local current_time=$(date +%s)
    local time_since_last=$((current_time - LAST_DEPLOY))
    
    if [[ $time_since_last -ge $DEBOUNCE_SECONDS ]]; then
        echo "🚀 Changes detected, starting deployment..."
        LAST_DEPLOY=$current_time
        
        if bash "$DEPLOY_SCRIPT"; then
            echo "✅ Deployment successful at $(date)"
        else
            echo "❌ Deployment failed at $(date)"
        fi
        echo ""
    else
        echo "⏳ Changes detected but within debounce period (${time_since_last}s < ${DEBOUNCE_SECONDS}s)"
    fi
}

# Watch for file changes in development directory
inotifywait -m -r -e modify,create,delete,move \
    --exclude '/(\.git|node_modules|logs|tmp|\.claude)/.*' \
    --exclude '\.(log|tmp|swp|swo)$' \
    --format '%w%f %e' \
    "$DEV_DIR" | while read file event; do
    
    # Skip if file is temporary or part of build process
    if [[ "$file" =~ \.(tmp|swp|swo|log)$ ]] || [[ "$file" =~ node_modules ]] || [[ "$file" =~ \.git ]]; then
        continue
    fi
    
    # Only deploy for significant file changes
    if [[ "$file" =~ \.(ts|js|json|md|sh|toml)$ ]] || [[ "$file" =~ /src/ ]] || [[ "$file" =~ /config/ ]]; then
        echo "📝 File changed: $file ($event)"
        deploy_if_needed
    fi
done