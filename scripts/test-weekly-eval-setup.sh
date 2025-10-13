#!/bin/bash
# Test weekly evaluation setup without running full tests
# Quick validation of environment, paths, and dependencies

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Weekly Evaluation Setup Test"
echo "=========================================="
echo ""

# Test 1: Project directory
echo "✓ Project Directory: $PROJECT_DIR"
if [ ! -d "$PROJECT_DIR" ]; then
  echo "❌ Project directory not found"
  exit 1
fi

# Test 2: Environment variables
echo "✓ Checking environment variables..."
if [ -f "/prod/techsapo/.env" ]; then
  echo "  ✓ /prod/techsapo/.env exists"
  set -a
  source /prod/techsapo/.env
  set +a
else
  echo "  ⚠️  /prod/techsapo/.env not found (will use current environment)"
fi

if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  echo "  ✓ OPENROUTER_API_KEY is set"
else
  echo "  ❌ OPENROUTER_API_KEY not set"
  exit 1
fi

# Test 3: Required scripts
echo "✓ Checking required scripts..."
REQUIRED_SCRIPTS=(
  "scripts/run-multi-model-eval.ts"
  "scripts/run-security-pentest.ts"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
  if [ -f "$PROJECT_DIR/$script" ]; then
    echo "  ✓ $script exists"
  else
    echo "  ❌ $script not found"
    exit 1
  fi
done

# Test 4: Required directories
echo "✓ Checking required directories..."
REQUIRED_DIRS=(
  "/var/techsapo/logs/evals"
  "/audit/techdev/evals/golden"
  "/audit/techdev/evals/security"
  "/audit/techdev/evals/benchmarks"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✓ $dir exists"
  else
    echo "  ⚠️  $dir not found (will be created)"
    sudo mkdir -p "$dir"
    sudo chown wombat:wombat "$dir"
    echo "    ✓ Created $dir"
  fi
done

# Test 5: Node.js and TypeScript
echo "✓ Checking Node.js and dependencies..."
cd "$PROJECT_DIR"

if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo "  ✓ Node.js: $NODE_VERSION"
else
  echo "  ❌ Node.js not found in PATH"
  exit 1
fi

if command -v npx &> /dev/null; then
  echo "  ✓ npx available"
else
  echo "  ❌ npx not found"
  exit 1
fi

if [ -f "package.json" ]; then
  echo "  ✓ package.json exists"
else
  echo "  ❌ package.json not found"
  exit 1
fi

# Test 6: TypeScript compilation check
echo "✓ Checking TypeScript files..."
if npx tsc --noEmit --project tsconfig.json 2>&1 | head -5; then
  echo "  ✓ TypeScript files compile (or minor warnings only)"
else
  echo "  ⚠️  TypeScript compilation has errors (may still work at runtime)"
fi

# Test 7: Log file creation test
echo "✓ Testing log file creation..."
TEST_LOG="/var/techsapo/logs/evals/test-$(date +%Y%m%d_%H%M%S).log"
if echo "Test log entry" > "$TEST_LOG"; then
  echo "  ✓ Log file writable: $TEST_LOG"
  rm "$TEST_LOG"
else
  echo "  ❌ Cannot write to log directory"
  exit 1
fi

# Test 8: Cron installation check
echo "✓ Checking cron installation..."
if crontab -l 2>/dev/null | grep -q "run-weekly-eval.sh"; then
  echo "  ✓ Cron job already installed"
  crontab -l | grep "run-weekly-eval.sh"
else
  echo "  ⚠️  Cron job not yet installed"
  echo "    To install, run:"
  echo "    crontab -e"
  echo "    # Add line: 0 2 * * 0 /ai/prj/techdev/scripts/run-weekly-eval.sh"
fi

# Test 9: jq availability (for regression detection)
echo "✓ Checking jq (JSON processor)..."
if command -v jq &> /dev/null; then
  echo "  ✓ jq available: $(jq --version)"
else
  echo "  ⚠️  jq not found (regression detection will fail)"
  echo "    Install: sudo yum install jq"
fi

echo ""
echo "=========================================="
echo "✅ Setup Test Completed Successfully"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Install cron job (if not already installed):"
echo "   crontab -e"
echo "   # Add: 0 2 * * 0 /ai/prj/techdev/scripts/run-weekly-eval.sh"
echo ""
echo "2. Test manual execution:"
echo "   /ai/prj/techdev/scripts/run-weekly-eval.sh"
echo ""
echo "3. Monitor first scheduled run:"
echo "   tail -f /var/techsapo/logs/evals/weekly-eval-*.log"
