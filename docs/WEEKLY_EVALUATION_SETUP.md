# Weekly Evaluation Cron Job Setup

This guide explains how to set up automated weekly LLM evaluations for TechSapo.

## Overview

The weekly evaluation system automatically runs:
- **Golden Tests**: Refactoring, bug-fixing, and code porting benchmarks
- **Security Tests**: Adversarial prompt penetration testing

**Schedule:** Every Sunday at 2:00 AM JST

**Duration:** ~5-10 minutes per evaluation

**Models Tested:**
- GPT-5 Codex
- Qwen3 Coder

---

## Prerequisites

1. **Node.js and TypeScript** installed
2. **Environment variables** configured (OPENROUTER_API_KEY)
3. **Audit directory** writable (`/audit/techdev/evals/`)
4. **Log directory** writable (`/var/techsapo/logs/evals/`)

---

## Installation Steps

### 1. Make script executable

```bash
chmod +x /ai/prj/techdev/scripts/run-weekly-eval.sh
```

### 2. Test manual execution

```bash
# Dry run to verify script works
/ai/prj/techdev/scripts/run-weekly-eval.sh
```

Expected output:
```
[2025-10-05 14:30:00] ==========================================
[2025-10-05 14:30:00] Weekly LLM Evaluation Started
[2025-10-05 14:30:00] ==========================================
[2025-10-05 14:30:00] Project Directory: /ai/prj/techdev
[2025-10-05 14:30:00] Log File: /var/techsapo/logs/evals/weekly-eval-20251005_143000.log
...
[2025-10-05 14:35:00] ✅ Weekly evaluation completed successfully
```

### 3. Install cron job

```bash
# Edit crontab as wombat user
sudo crontab -u wombat -e

# Add the following line:
0 2 * * 0 /ai/prj/techdev/scripts/run-weekly-eval.sh
```

**Alternative: Import from file**

```bash
# Load cron configuration from file
sudo crontab -u wombat /ai/prj/techdev/scripts/weekly-eval.cron
```

### 4. Verify cron job installation

```bash
# List cron jobs for wombat user
sudo crontab -u wombat -l

# Expected output:
# 0 2 * * 0 /ai/prj/techdev/scripts/run-weekly-eval.sh
```

### 5. Check cron service status

```bash
# Verify cron daemon is running
sudo systemctl status cron

# If not running, start it:
sudo systemctl start cron
sudo systemctl enable cron
```

---

## Monitoring

### View latest evaluation log

```bash
# Find latest log file
ls -lht /var/techsapo/logs/evals/ | head -5

# View latest log
tail -f /var/techsapo/logs/evals/weekly-eval-*.log
```

### Check evaluation results

```bash
# Golden test results
ls -lh /audit/techdev/evals/golden/

# Security test results
ls -lh /audit/techdev/evals/security/

# Benchmarks
ls -lh /audit/techdev/evals/benchmarks/
```

### Check for regressions

```bash
# Compare latest two benchmarks for a model
MODEL="qwen3-coder"
LATEST=$(ls -t /audit/techdev/evals/benchmarks/*-${MODEL}-benchmark.json | head -1)
PREVIOUS=$(ls -t /audit/techdev/evals/benchmarks/*-${MODEL}-benchmark.json | head -2 | tail -1)

echo "Latest:"
jq -r '.overallScore' "$LATEST"

echo "Previous:"
jq -r '.overallScore' "$PREVIOUS"
```

---

## Troubleshooting

### Cron job not running

**Check cron logs:**
```bash
# System cron log
sudo tail -f /var/log/cron

# Or journalctl
sudo journalctl -u cron -f
```

**Common issues:**
1. **Script not executable**: `chmod +x /ai/prj/techdev/scripts/run-weekly-eval.sh`
2. **Environment variables missing**: Verify OPENROUTER_API_KEY in script
3. **Node.js not in PATH**: Add `/data/.nvm/versions/node/v22.9.0/bin` to cron PATH

### Evaluation failures

**Check log file:**
```bash
cat /var/techsapo/logs/evals/weekly-eval-YYYYMMDD_HHMMSS.log
```

**Common errors:**
1. **OPENROUTER_API_KEY not set**: Verify environment variable
2. **Timeout errors**: Increase timeout in LLM client
3. **Disk space full**: Clean up old logs/results

**Manual retry:**
```bash
/ai/prj/techdev/scripts/run-weekly-eval.sh
```

### Email notifications on failure

**Add email notification to cron:**
```bash
# Edit crontab
sudo crontab -u wombat -e

# Add MAILTO directive at top:
MAILTO=admin@techsapo.com

# Cron will email output on failures
0 2 * * 0 /ai/prj/techdev/scripts/run-weekly-eval.sh
```

---

## Directory Structure

```
/ai/prj/techdev/
├── scripts/
│   ├── run-weekly-eval.sh          # Main evaluation script
│   ├── weekly-eval.cron            # Cron configuration
│   ├── run-multi-model-eval.ts     # Golden test runner
│   └── run-security-pentest.ts     # Security test runner
│
/var/techsapo/logs/evals/
├── weekly-eval-20251005_020000.log # Evaluation logs
├── weekly-eval-20251012_020000.log
└── ...
│
/audit/techdev/evals/
├── golden/
│   ├── 2025-10-05-gpt-5-codex-refactor-001.json
│   ├── 2025-10-05-qwen3-coder-refactor-001.json
│   └── ...
├── security/
│   ├── 2025-10-05-gpt-5-codex-prompt-injection-001.json
│   ├── 2025-10-05-qwen3-coder-prompt-injection-001.json
│   └── ...
└── benchmarks/
    ├── 2025-10-05-gpt-5-codex-benchmark.json
    ├── 2025-10-05-qwen3-coder-benchmark.json
    └── ...
```

---

## Retention Policy

**Logs:**
- Keep last 12 weeks (84 days)
- Automatic cleanup by script

**Evaluation Results:**
- Golden tests: 90 days (retention policy)
- Security tests: 730 days (2 years)
- Benchmarks: 365 days (1 year)

**Manual cleanup:**
```bash
# Remove logs older than 12 weeks
find /var/techsapo/logs/evals -type f -name "weekly-eval-*.log" -mtime +84 -delete

# Remove old golden test results (90 days)
find /audit/techdev/evals/golden -type f -name "*.json" -mtime +90 -delete

# Remove old benchmarks (365 days)
find /audit/techdev/evals/benchmarks -type f -name "*.json" -mtime +365 -delete
```

---

## Schedule Modifications

### Change to daily execution

```bash
# Every day at 3:00 AM
0 3 * * * /ai/prj/techdev/scripts/run-weekly-eval.sh
```

### Change to twice per week

```bash
# Sundays and Wednesdays at 2:00 AM
0 2 * * 0,3 /ai/prj/techdev/scripts/run-weekly-eval.sh
```

### Change to monthly execution

```bash
# First day of each month at 2:00 AM
0 2 1 * * /ai/prj/techdev/scripts/run-weekly-eval.sh
```

---

## Performance Metrics

**Expected execution time:**
- Golden tests (2 models × 6 tests): ~4-7 minutes
- Security tests (2 models × 6 tests): ~2-3 minutes
- **Total**: ~6-10 minutes

**Expected costs per run:**
- GPT-5 Codex: ~$0.022
- Qwen3 Coder: ~$0.005
- **Total per week**: ~$0.027
- **Annual cost**: ~$1.40

**Resource usage:**
- CPU: Minimal (I/O bound)
- Memory: ~200MB
- Disk: ~5MB per evaluation (results + logs)

---

## Alerting Configuration

### Webhook notifications (optional)

Add webhook call to script for Slack/Discord notifications:

```bash
# In run-weekly-eval.sh, add after evaluation completes:
curl -X POST "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Weekly LLM evaluation completed: $GOLDEN_RESULTS_COUNT golden tests, $SECURITY_RESULTS_COUNT security tests\"}"
```

### Regression alerts

Script automatically detects regressions > 5 points and logs warnings.

For email alerts, ensure MAILTO is set in crontab.

---

## Manual Execution

```bash
# Run full evaluation
/ai/prj/techdev/scripts/run-weekly-eval.sh

# Run only golden tests
npx ts-node /ai/prj/techdev/scripts/run-multi-model-eval.ts

# Run only security tests
npx ts-node /ai/prj/techdev/scripts/run-security-pentest.ts

# Test specific model
npx ts-node /ai/prj/techdev/scripts/run-multi-model-eval.ts --model qwen3-coder
```

---

## Disabling Cron Job

### Temporary disable

```bash
# Comment out cron job
sudo crontab -u wombat -e

# Add # at beginning of line:
# 0 2 * * 0 /ai/prj/techdev/scripts/run-weekly-eval.sh
```

### Permanent removal

```bash
# Remove cron job entirely
sudo crontab -u wombat -e

# Delete the evaluation line
```

---

## Support

For issues or questions:
- Check logs: `/var/techsapo/logs/evals/`
- View documentation: `/ai/prj/techdev/docs/EVALUATION_SUMMARY_*.md`
- Contact: wombat@techsapo.com

---

**Last Updated:** 2025-10-05
**Version:** 1.0.0
