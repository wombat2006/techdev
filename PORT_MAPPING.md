# TechSapo Port Mapping & Process Documentation

## 🎯 **Production Environment Configuration**

### **Primary Service Ports**

| Port | Service | Status | Description |
|------|---------|--------|-------------|
| **3000** | 🚀 **Main Production Server** | ✅ Active | メインプロダクションシステム |
| 3001 | Development Server | ⚠️ Test Only | 開発・テスト用 |
| 3002 | Cipher MCP API | ✅ Active | Memory management service |

### **Service Architecture**

#### **Port 3000 - Main Production Wall-Bounce System**
- **Name**: TechSapo Main Production System
- **Features**:
  - ✅ Gemini CLI Integration (no API_KEY required)
  - ✅ Claude Internal Analysis
  - ✅ Codex GPT-5 via MCP
  - ✅ Wall-Bounce consensus (minimum 2 providers)
  - ✅ Production-ready error handling
- **Endpoints**:
  - `GET /api/v1/health` - System health check
  - `POST /api/v1/generate` - Multi-LLM generation with wall-bounce
  - `POST /api/v1/analyze-logs` - Log analysis with consensus

#### **Supporting Services**
- **Codex MCP**: PID 3453 (Model Context Protocol server)
- **Cipher MCP**: PID 4093 (Memory management agent)
- **TypeScript LSP**: PID 4048 (Language server)

## 🧹 **Recently Cleaned Processes**

### **Terminated Test Servers**
- ~~Port 4001~~ - Gemini API version (terminated)
- ~~Port 4002~~ - CLI integration test (terminated)

### **Current Active Processes**
```bash
# Main production server
PORT=4003 NODE_OPTIONS='--max-old-space-size=1024 --expose-gc' node dist/server.js

# Supporting services
cipher --mode mcp --agent memAgent/cipher.yml  # Memory management
codex mcp serve                                  # MCP server
```

## 🔧 **Management Commands**

### **Production Server Control**
```bash
# Start main production server
PORT=3000 NODE_OPTIONS='--max-old-space-size=1024 --expose-gc' node dist/server.js

# Health check
curl http://localhost:3000/api/v1/health

# Test wall-bounce functionality
curl -X POST http://localhost:3000/api/v1/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test","task_type":"basic"}'
```

### **Process Monitoring**
```bash
# Check active ports
ss -tlnp | grep :400

# Check Node.js processes
ps aux | grep node | grep -v grep

# Monitor production server logs
tail -f logs/app.log
```

## 📊 **System Requirements**

### **Memory Configuration**
- **Node.js Memory**: 1024MB (`--max-old-space-size=1024`)
- **Garbage Collection**: Enabled (`--expose-gc`)
- **Request Timeout**: 300 seconds (5 minutes)
- **Max Concurrent**: 50 requests

### **Environment Configuration**
- **SRP Traffic**: 50% production deployment
- **Gemini Strategy**: CLI-only (no API)
- **Provider Minimum**: 2 LLMs for consensus
- **Confidence Threshold**: 70%

## 🚀 **Production Deployment Status**

**Current Version**: phase3f-gemini-cli-v1.0
**Deployment Date**: 2025-09-27
**Wall-Bounce System**: ✅ Production Ready
**Mock Elimination**: ✅ Complete
**Test Suite**: ✅ 100% Success Rate

---
*Generated: 2025-09-27*
*Last Updated: Process cleanup and port standardization*