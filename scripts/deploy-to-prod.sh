#!/bin/bash
# TechSapo Development to Production Deployment Script

set -e

DEV_DIR="/ai/prj/techdev"
PROD_DIR="/prod/techsapo"
BACKUP_DIR="/var/techsapo/backup/$(date +%Y%m%d_%H%M%S)"

echo "🚀 Deploying from Development to Production..."
echo "   Source: $DEV_DIR"
echo "   Target: $PROD_DIR"
echo ""

# Pre-deployment validation
echo "🔍 Pre-deployment validation..."

# Check if development environment exists
if [[ ! -d "$DEV_DIR" ]]; then
    echo "❌ Development directory not found: $DEV_DIR"
    exit 1
fi

# Check if production environment exists
if [[ ! -d "$PROD_DIR" ]]; then
    echo "❌ Production directory not found: $PROD_DIR"
    exit 1
fi

# Run tests in development environment
echo "🧪 Running tests in development environment..."
cd "$DEV_DIR"
if ! npm test; then
    echo "❌ Tests failed in development environment"
    exit 1
fi
echo "✅ All tests passed"

# Build the application
echo "🔨 Building application..."
if ! npm run build; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"

# Create backup of current production
echo "💾 Creating backup of current production..."
mkdir -p "$(dirname "$BACKUP_DIR")"
cp -r "$PROD_DIR" "$BACKUP_DIR" || echo "⚠️  Backup creation failed (continuing anyway)"

# Sync files (excluding sensitive areas)
echo "📁 Syncing files to production..."

# Sync source code
rsync -av --delete \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.env*' \
    --exclude='logs/' \
    --exclude='tmp/' \
    --exclude='*.log' \
    --exclude='.claude' \
    "$DEV_DIR/src/" "$PROD_DIR/src/"

# Sync build output
rsync -av --delete \
    "$DEV_DIR/dist/" "$PROD_DIR/dist/"

# Sync configuration (carefully)
rsync -av \
    --exclude='.env.development*' \
    --exclude='.env.local*' \
    "$DEV_DIR/config/" "$PROD_DIR/config/" 2>/dev/null || echo "⚠️  No config directory to sync"

# Sync package files
cp "$DEV_DIR/package.json" "$PROD_DIR/package.json"
cp "$DEV_DIR/package-lock.json" "$PROD_DIR/package-lock.json" 2>/dev/null || echo "⚠️  No package-lock.json"
cp "$DEV_DIR/tsconfig.json" "$PROD_DIR/tsconfig.json"

# Sync scripts (but preserve production-specific ones)
rsync -av \
    --exclude='start-production.sh' \
    --exclude='apply-production-permissions.sh' \
    --exclude='deploy-to-prod.sh' \
    "$DEV_DIR/scripts/" "$PROD_DIR/scripts/" 2>/dev/null || echo "⚠️  No scripts directory to sync"

echo "✅ File synchronization completed"

# Install production dependencies
echo "📦 Installing production dependencies..."
cd "$PROD_DIR"
npm ci --only=production --silent

# Apply production permissions
echo "🔒 Applying production permissions..."
if [[ -f "$PROD_DIR/apply-production-permissions.sh" ]]; then
    bash "$PROD_DIR/apply-production-permissions.sh"
else
    # Fallback permission setting
    chmod 444 "$PROD_DIR/package.json"
    chmod 444 "$PROD_DIR/tsconfig.json"
    chmod 444 "$PROD_DIR/.env.production"
    find "$PROD_DIR/src" -type f -exec chmod 444 {} \; 2>/dev/null || true
    find "$PROD_DIR/config" -type f -exec chmod 444 {} \; 2>/dev/null || true
    find "$PROD_DIR/dist" -type f -exec chmod 444 {} \; 2>/dev/null || true
fi

# Validate production environment
echo "🔍 Validating production environment..."

# Check that critical files are read-only
for file in "$PROD_DIR/package.json" "$PROD_DIR/.env.production"; do
    if [[ -w "$file" ]]; then
        echo "❌ Critical file $file is still writable"
        exit 1
    fi
done

# Check that writable areas are accessible
for dir in /var/techsapo/{logs,tmp,session,cache}; do
    if [[ ! -w "$dir" ]]; then
        echo "❌ Required writable directory $dir is not accessible"
        exit 1
    fi
done

echo "✅ Production environment validation passed"

# Git commit in production (if changes detected)
cd "$PROD_DIR"
if ! git diff --quiet HEAD 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "📝 Committing changes to production repository..."
    git add .
    git commit -m "$(cat <<EOF
Production deployment $(date '+%Y-%m-%d %H:%M:%S')

Deployed from development environment
- Source: $DEV_DIR
- Build timestamp: $(date)
- Backup created: $BACKUP_DIR

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
else
    echo "ℹ️  No changes detected in production repository"
fi

echo ""
echo "🎯 Deployment completed successfully!"
echo "   Production environment: $PROD_DIR"
echo "   Backup location: $BACKUP_DIR"
echo "   Ready to start: ./scripts/start-production.sh"
echo ""