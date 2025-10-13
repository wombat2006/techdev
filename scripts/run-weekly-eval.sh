#!/bin/bash
# Weekly LLM Evaluation Execution Script
# Runs golden tests + security penetration tests
# Scheduled: Sundays at 2:00 AM

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/var/techsapo/logs/evals"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/weekly-eval-${TIMESTAMP}.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=========================================="
log "Weekly LLM Evaluation Started"
log "=========================================="
log "Project Directory: $PROJECT_DIR"
log "Log File: $LOG_FILE"
log ""

# Change to project directory
cd "$PROJECT_DIR"

# Load environment variables
if [ -f "/prod/techsapo/.env" ]; then
  log "Loading environment variables from /prod/techsapo/.env"
  set -a
  source /prod/techsapo/.env
  set +a
else
  log "WARNING: /prod/techsapo/.env not found"
fi

# Verify required environment variables
if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  log "ERROR: OPENROUTER_API_KEY not set"
  exit 1
fi

log "Environment variables loaded successfully"
log ""

# Run Golden Tests
log "=========================================="
log "Phase 1: Golden Tests"
log "=========================================="

if npx ts-node scripts/run-multi-model-eval.ts >> "$LOG_FILE" 2>&1; then
  log "✅ Golden tests completed successfully"
else
  log "❌ Golden tests failed with exit code $?"
  GOLDEN_FAILED=1
fi

log ""

# Run Security Penetration Tests
log "=========================================="
log "Phase 2: Security Penetration Tests"
log "=========================================="

if npx ts-node scripts/run-security-pentest.ts >> "$LOG_FILE" 2>&1; then
  log "✅ Security tests completed successfully"
else
  log "❌ Security tests failed with exit code $?"
  SECURITY_FAILED=1
fi

log ""

# Generate Summary Report
log "=========================================="
log "Evaluation Summary"
log "=========================================="

# Count results
GOLDEN_RESULTS_COUNT=$(find /audit/techdev/evals/golden -type f -name "$(date +%Y-%m-%d)-*.json" 2>/dev/null | wc -l)
SECURITY_RESULTS_COUNT=$(find /audit/techdev/evals/security -type f -name "$(date +%Y-%m-%d)-*.json" 2>/dev/null | wc -l)
BENCHMARK_COUNT=$(find /audit/techdev/evals/benchmarks -type f -name "$(date +%Y-%m-%d)-*.json" 2>/dev/null | wc -l)

log "Golden Test Results: $GOLDEN_RESULTS_COUNT files"
log "Security Test Results: $SECURITY_RESULTS_COUNT files"
log "Benchmarks Generated: $BENCHMARK_COUNT files"
log ""

# Check for regressions (compare to previous week's benchmark)
log "Checking for regressions..."

# Get latest benchmark for each model
PREV_DATE=$(date -d '7 days ago' +%Y-%m-%d)
for model in "gpt-5-codex" "qwen3-coder"; do
  CURRENT_BENCHMARK="/audit/techdev/evals/benchmarks/$(date +%Y-%m-%d)-${model}-benchmark.json"
  PREVIOUS_BENCHMARK=$(find /audit/techdev/evals/benchmarks -type f -name "*-${model}-benchmark.json" -not -name "$(date +%Y-%m-%d)-*" | sort -r | head -1)

  if [ -f "$CURRENT_BENCHMARK" ] && [ -f "$PREVIOUS_BENCHMARK" ]; then
    CURRENT_SCORE=$(jq -r '.overallScore' "$CURRENT_BENCHMARK" 2>/dev/null || echo "0")
    PREVIOUS_SCORE=$(jq -r '.overallScore' "$PREVIOUS_BENCHMARK" 2>/dev/null || echo "0")

    SCORE_DIFF=$(echo "$CURRENT_SCORE - $PREVIOUS_SCORE" | bc)

    log "  $model: $PREVIOUS_SCORE → $CURRENT_SCORE (Δ $SCORE_DIFF)"

    # Alert if regression > 5 points
    if (( $(echo "$SCORE_DIFF < -5" | bc -l) )); then
      log "  ⚠️  REGRESSION DETECTED: Score dropped by ${SCORE_DIFF#-} points"
    fi
  else
    log "  $model: No previous benchmark for comparison"
  fi
done

log ""

# Final status
log "=========================================="
if [ -n "${GOLDEN_FAILED:-}" ] || [ -n "${SECURITY_FAILED:-}" ]; then
  log "❌ Weekly evaluation completed with errors"
  log "=========================================="
  exit 1
else
  log "✅ Weekly evaluation completed successfully"
  log "=========================================="
fi

# Cleanup old logs (keep last 12 weeks)
log "Cleaning up old evaluation logs (keeping last 12 weeks)..."
find "$LOG_DIR" -type f -name "weekly-eval-*.log" -mtime +84 -delete
log "Cleanup completed"

log ""
log "Full log available at: $LOG_FILE"
