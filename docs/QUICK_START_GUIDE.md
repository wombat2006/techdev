# Quick Start Guide

A step-by-step guide to get TechSapo up and running for first-time developers.

## 🎯 What You'll Accomplish

By the end of this guide, you will:
1. ✅ Have a working development environment
2. ✅ Run TechSapo locally
3. ✅ Execute your first wall-bounce analysis
4. ✅ Run the test suite successfully
5. ✅ Understand the key components

**Estimated Time**: 45-60 minutes

---

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

```bash
# Check Node.js version (must be 18.0.0 or higher)
node --version  # Should show v18.x.x or higher

# Check npm
npm --version

# Check git
git --version

# Check if you have a code editor
code --version  # VS Code (or your preferred editor)
```

### Required API Keys

You'll need API keys from:
- [ ] **Hugging Face**: https://huggingface.co/settings/tokens
- [ ] **OpenRouter**: https://openrouter.ai/keys
- [ ] **Upstash Redis**: https://upstash.com/ (free tier available)
- [ ] **Google AI** (optional): https://makersuite.google.com/app/apikey
- [ ] **Context7** (optional): https://www.context7.com/

**Don't have all keys yet?** You can still set up the environment and add keys later.

---

## 🚀 Step 1: Clone and Install

### 1.1 Clone the Repository

```bash
# Navigate to your projects directory
cd /ai/prj  # or your preferred location

# Clone the repository
git clone <repository-url> techdev
cd techdev
```

### 1.2 Install Dependencies

```bash
# Install all npm packages
npm install

# This will take 2-3 minutes
# You should see "added XXX packages" when complete
```

**Troubleshooting**:
- If you see warnings about deprecated packages, you can ignore them
- If you see errors about Python or build tools, see [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

## 🔐 Step 2: Configure Environment

### 2.1 Create Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Or create a new one
touch .env
```

### 2.2 Add Your API Keys

Open `.env` in your editor and add your keys:

```bash
# Required - Core functionality
HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxx

# Required - Redis (Upstash free tier)
UPSTASH_REDIS_REST_URL=https://your-redis-name.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Optional - Enhanced features
GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CONTEXT7_API_KEY=ctx7sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server configuration
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
```

**Getting Upstash Redis** (Free):
1. Go to https://upstash.com/
2. Sign up (free tier includes 10,000 commands/day)
3. Create a new Redis database
4. Copy the "REST URL" and "REST TOKEN"

### 2.3 Validate Environment

```bash
# Quick validation
node -e "require('dotenv').config(); console.log('✓ HUGGINGFACE_API_KEY:', !!process.env.HUGGINGFACE_API_KEY); console.log('✓ OPENROUTER_API_KEY:', !!process.env.OPENROUTER_API_KEY); console.log('✓ UPSTASH_REDIS_REST_URL:', !!process.env.UPSTASH_REDIS_REST_URL);"
```

You should see three `true` values.

---

## 🏗️ Step 3: Build the Project

### 3.1 Build TypeScript

```bash
# Compile TypeScript to JavaScript
npm run build

# This should complete without errors
# Output will be in the dist/ directory
```

### 3.2 Verify Build

```bash
# Check that dist/ directory exists
ls -la dist/

# You should see:
# - index.js
# - config/
# - services/
# - routes/
# - utils/
```

**Common Build Issues**:
- **TypeScript errors**: Check `tsconfig.json` has `strict: false`
- **Missing dist/**: Run `npm run build` again
- **Permission errors**: Check file permissions with `ls -la`

---

## ▶️ Step 4: Start Development Server

### 4.1 Start in Development Mode

```bash
# Start with hot reload
npm run dev

# You should see:
# > ts-node-dev --respawn --transpile-only src/index.ts
# Server started on port 5000
# Environment: development
```

### 4.2 Verify Server is Running

Open a **new terminal** and test:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Expected response:
# {"status":"healthy","timestamp":"2025-...","uptime":...}
```

**Server Won't Start?** See [Troubleshooting Guide](./TROUBLESHOOTING.md#port-already-in-use)

---

## 🧪 Step 5: Run Your First Wall-Bounce

### 5.1 Test Simple Query

```bash
# In a new terminal (keep dev server running)
curl -X POST http://localhost:5000/api/v1/wall-bounce \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is TypeScript?",
    "priority": "standard"
  }' | jq
```

### 5.2 Expected Response

```json
{
  "success": true,
  "analysis": "TypeScript is a strongly typed programming language...",
  "confidence_score": 0.85,
  "consensus_score": 0.78,
  "providers_used": ["gemini-2.5-flash", "qwen3-coder", "sonnet-4.5"],
  "rounds": 3
}
```

**What Just Happened?**
1. Your query was sent to multiple LLM providers
2. Each provider gave their response
3. Responses were analyzed for consensus
4. A synthesized answer was returned

---

## ✅ Step 6: Run Tests

### 6.1 Run Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Expected output:
# PASS tests/unit/...
# Test Suites: X passed, X total
# Tests:       X passed, X total
```

### 6.2 Run Integration Tests (Optional)

```bash
# These take longer (up to 10 minutes)
npm run test:integration

# Or run a specific test
npm test -- tests/integration/wall-bounce.test.ts
```

**Tests Failing?**
- Check that your API keys are valid
- Verify Redis connection: `curl $UPSTASH_REDIS_REST_URL/ping -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"`
- See [Testing Guide](./TESTING_GUIDE.md)

---

## 🎓 Step 7: Understand the Architecture

### 7.1 Key Files to Know

```
techdev/
├── src/
│   ├── index.ts                        # Main server entry point
│   ├── routes/
│   │   └── wall-bounce-api.ts          # Wall-bounce endpoint
│   ├── services/
│   │   ├── wall-bounce-analyzer.ts     # Core orchestrator
│   │   └── wall-bounce-orchestrator.ts # Provider selection
│   └── config/
│       ├── environment.ts              # Environment setup
│       └── llm-providers.json          # LLM configuration
├── tests/                              # All tests
├── docs/                               # Documentation
├── .env                                # Your environment variables
└── CLAUDE.md                           # Claude Code guide
```

### 7.2 Core Concepts

**Wall-Bounce System**:
- Queries are sent to 2+ LLM providers
- Responses are cross-validated
- Consensus score determines quality
- Minimum 3 rounds, maximum 6 rounds

**LLM Provider Tiers**:
- **Tier 1**: Gemini 2.5 (fast, cost-effective)
- **Tier 2**: GPT-5 Codex via Codex CLI, Qwen3-Coder (quality + coding)
- **Tier 3**: Claude Sonnet 4.5 (aggregation)
- **Tier 4**: Claude Opus 4.1 (complex tasks)

Read more: [Wall-Bounce System](./WALL_BOUNCE_SYSTEM.md)

---

## 🔧 Step 8: Development Workflow

### 8.1 Making Changes

```bash
# 1. Make your changes in src/
vim src/services/your-service.ts

# 2. Dev server auto-reloads (if using npm run dev)
# Watch the terminal for compilation errors

# 3. Run tests
npm test -- tests/unit/your-service.test.ts

# 4. Build for production
npm run build
```

### 8.2 Code Style

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### 8.3 Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make commits
git add .
git commit -m "feat: add your feature"

# Push to remote
git push origin feature/your-feature
```

---

## 📚 Next Steps

### Essential Reading

1. **[CLAUDE.md](../CLAUDE.md)** - Understanding Claude Code integration (15 min)
2. **[LLM Providers Guide](./LLM_PROVIDERS_GUIDE.md)** - Deep dive into provider integration (30 min)
3. **[Environment Setup](./ENVIRONMENT_SETUP.md)** - Advanced environment configuration (20 min)

### Try These Tasks

1. **Modify a Provider**: Edit `src/config/llm-providers.json` to change model parameters
2. **Add a Route**: Create a new endpoint in `src/routes/`
3. **Write a Test**: Add a unit test for a service
4. **Deploy Locally**: Follow [Deployment Guide](./DEPLOYMENT_GUIDE.md)

### Join the Community

- Read [Best Practices](./BEST_PRACTICES_GUIDE.md)
- Review [Architecture Overview](./ARCHITECTURE_OVERVIEW.md)
- Contribute improvements (see [Development Guide](./DEVELOPMENT_GUIDE.md))

---

## 🆘 Getting Help

### Quick Fixes

| Problem | Solution |
|---------|----------|
| Port in use | `PORT=6000 npm run dev` |
| Build errors | `rm -rf dist && npm run build` |
| Test failures | Check API keys and Redis connection |
| Redis errors | Verify Upstash credentials in `.env` |

### Resources

- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues & solutions
- **[Documentation Index](./DOCUMENTATION_INDEX.md)** - All 18 guides
- **[API Reference](./API_REFERENCE.md)** - Complete API documentation

### Still Stuck?

1. Check existing issues in the repository
2. Review the [Team Manual](./TEAM_MANUAL.md)
3. Ask in #techsapo-development (if available)

---

## ✨ Congratulations!

You now have:
- ✅ A working TechSapo development environment
- ✅ Understanding of the wall-bounce system
- ✅ Ability to run and test the codebase
- ✅ Knowledge of where to find detailed documentation

**Ready to contribute?** Check out the [Development Guide](./DEVELOPMENT_GUIDE.md) for best practices and workflows.

**Happy coding! 🚀**
