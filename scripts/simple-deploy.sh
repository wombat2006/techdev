#!/bin/bash
# Simple Git-based Deployment

echo "🚀 Deploying from development..."

cd /prod/techsapo

# Pull latest changes from development
git fetch dev
git merge dev/master

# Install dependencies and build
npm ci --only=production
npm run build

# Apply production permissions
chmod 444 package.json .env.production
find src -type f -exec chmod 444 {} \; 2>/dev/null || true
find dist -type f -exec chmod 444 {} \; 2>/dev/null || true

echo "✅ Deployment completed!"