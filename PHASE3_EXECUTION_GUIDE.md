# 🎯 SRP Phase 3 (5%) Execution Guide

**Phase**: 3 - Extended Production Test
**Traffic**: 5% SRP, 95% Legacy
**Duration**: 24-72 hours
**Status**: ✅ Ready for execution

---

## 📋 Pre-Execution Checklist

### ✅ Prerequisites Verified
- [x] Phase 1 (1%) test completed successfully
- [x] Safety monitoring systems operational
- [x] Emergency rollback procedures tested
- [x] Development team on standby
- [x] All configurations prepared and validated

### 🛡️ Safety Measures in Place
- [x] **Automated monitoring** with 15-minute reporting
- [x] **Auto-rollback triggers** for critical thresholds
- [x] **Emergency rollback script** ready (`./scripts/emergency-rollback-phase3.sh`)
- [x] **Enhanced thresholds** for 5% traffic volume
- [x] **Real-time alerting** system active

---

## 🚀 Phase 3 Execution Steps

### Step 1: Final Pre-Flight Check
```bash
# 1. Verify current system status
npm run build
npm test

# 2. Check baseline metrics
curl http://localhost:4000/health
curl http://localhost:4000/metrics

# 3. Ensure emergency scripts are executable
ls -la ./scripts/emergency-rollback-phase3.sh
ls -la ./scripts/monitor-srp-phase3.js
```

### Step 2: Activate Phase 3 Configuration
```bash
# ⚠️ CRITICAL: Only execute after final approval

# Backup current configuration
cp .env .env.pre-phase3-backup

# Apply Phase 3 configuration
cp .env.phase3-5percent .env

# Verify configuration
grep "SRP_TRAFFIC_PERCENTAGE" .env  # Should show: 5
grep "USE_SRP_WALL_BOUNCE" .env     # Should show: true
```

### Step 3: Start Enhanced Monitoring
```bash
# Start Phase 3 monitoring in background
nohup node ./scripts/monitor-srp-phase3.js > ./logs/phase3-monitor.log 2>&1 &

# Verify monitoring is active
ps aux | grep "monitor-srp-phase3"
tail -f ./logs/phase3-monitor.log
```

### Step 4: Application Restart
```bash
# Restart application to apply new configuration
npm run build
npm start

# Or with PM2 (if available)
pm2 restart all
```

### Step 5: Initial Validation (First 15 minutes)
```bash
# Monitor initial metrics
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/health

# Check logs for SRP activity
tail -f ./logs/app.log | grep "SRP\|wall-bounce"

# Verify traffic distribution
# Should see approximately 5% of requests using SRP
```

---

## 📊 Monitoring During Phase 3

### 🎯 Key Metrics to Watch

| Metric | Target | Warning | Critical |
|--------|---------|---------|----------|
| **Error Rate** | < 1% | > 1% | > 5% |
| **SRP Latency** | < 3000ms | > 5000ms | > 8000ms |
| **Memory Usage** | < 70% | > 80% | > 95% |
| **Consensus Success** | > 90% | < 80% | < 70% |

### 🔍 Monitoring Commands

```bash
# Real-time status
tail -f ./logs/phase3-monitor.log

# Manual metrics check
node -e "
  const metrics = require('./dist/middleware/metrics-middleware.js');
  console.log('Current metrics:', metrics.getStatusReport());
"

# System health
free -h              # Memory usage
df -h               # Disk usage
ps aux | grep node  # Process status
```

### 📈 Expected Traffic Pattern
```
Expected Distribution (over 24 hours):
├── SRP Requests:    ~5% (50-200 requests/hour depending on load)
├── Legacy Requests: ~95% (950-1900 requests/hour)
└── Error Rate:      < 1% combined
```

---

## 🚨 Emergency Procedures

### Auto-Rollback Triggers
The system will **automatically rollback** if:
- Error rate > 5%
- SRP latency > 8000ms
- Memory usage > 95%
- Multiple system failures

### Manual Emergency Rollback
```bash
# 🚨 EMERGENCY ONLY
./scripts/emergency-rollback-phase3.sh

# Verify rollback success
grep "USE_SRP_WALL_BOUNCE" .env  # Should show: false
curl http://localhost:4000/health
```

### Emergency Contacts
- **Development Team**: Immediate Slack notification
- **System Admin**: Email alert for critical issues
- **On-Call Engineer**: Phone notification for emergencies

---

## ✅ Success Criteria

### Phase 3 Considered Successful If:
1. **Stability**: No auto-rollbacks triggered
2. **Performance**: Average latency increase < 20%
3. **Quality**: Consensus confidence > 0.7
4. **Reliability**: Error rate remains < 2%
5. **Duration**: Runs stable for minimum 24 hours

### Progression to Phase 4 (10%):
- All success criteria met for 48+ hours
- Development team approval
- System resources adequate
- No significant issues detected

---

## 📋 Phase 3 Timeline

| Time | Milestone | Action Required |
|------|-----------|-----------------|
| **T+0** | Launch | Execute Phase 3 configuration |
| **T+15min** | Initial Check | Verify traffic distribution |
| **T+1hr** | First Report | Review monitoring metrics |
| **T+4hr** | Status Review | Team check-in |
| **T+24hr** | Milestone | Evaluate success criteria |
| **T+48hr** | Decision Point | Plan Phase 4 or extend |
| **T+72hr** | Maximum Duration | Mandatory review |

---

## 🔧 Troubleshooting

### Common Issues and Solutions

**Issue**: SRP traffic percentage not matching expected 5%
```bash
# Solution: Check feature flag configuration
grep -E "(SRP_TRAFFIC|USE_SRP)" .env
# Restart application if needed
```

**Issue**: High latency in SRP requests
```bash
# Solution: Check LLM provider health
curl http://localhost:4000/api/v1/health
# Monitor consensus engine performance
```

**Issue**: Memory usage climbing
```bash
# Solution: Check for memory leaks
node -e "console.log(process.memoryUsage())"
# Consider reducing consensus complexity
```

**Issue**: Consensus failures
```bash
# Solution: Check LLM provider availability
# Review wall-bounce orchestrator logs
tail -f ./logs/app.log | grep "consensus\|agreement"
```

---

## 📝 Reporting and Documentation

### Automated Reports
- **15-minute intervals**: Basic metrics and health status
- **Hourly reports**: Detailed performance analysis
- **Daily summary**: Comprehensive review and trends

### Manual Reporting
```bash
# Generate status report
node ./scripts/generate-phase3-report.js

# Export metrics for analysis
curl http://localhost:4000/metrics > phase3-metrics-$(date +%Y%m%d-%H%M).txt
```

### Post-Phase 3 Analysis
After Phase 3 completion, generate comprehensive report:
1. Traffic distribution analysis
2. Performance comparison vs baseline
3. Error rate and reliability metrics
4. Resource utilization trends
5. Recommendations for Phase 4

---

## 🎯 Phase 3 Success Indicators

### Green Light (Continue to Phase 4)
- ✅ 0 auto-rollbacks triggered
- ✅ Error rate < 1.5% consistently
- ✅ Performance degradation < 15%
- ✅ All 4 LLM providers healthy
- ✅ Consensus quality maintained

### Yellow Light (Extend monitoring)
- ⚠️ Minor performance issues (15-25% degradation)
- ⚠️ Occasional consensus failures (< 5%)
- ⚠️ 1-2 non-critical alerts
- ⚠️ Resource usage slightly elevated

### Red Light (Rollback required)
- ❌ Auto-rollback triggered
- ❌ Error rate > 3% sustained
- ❌ Performance degradation > 30%
- ❌ Multiple system failures
- ❌ Customer impact detected

---

**🚨 Remember: Proceed carefully. Phase 3 involves 5x the traffic of Phase 1.**

**📞 Emergency contact: development-team**
**📄 Full logs: `./logs/phase3-monitor.log`**
**🛡️ Auto-rollback: Enabled and tested**