<<<<<<< HEAD
# TechSapo Hugging Face Integration

Enterprise-grade Infrastructure Support Tool with Multi-Tier LLM Orchestrator and Japanese embedding models integration.

## 🚀 Features

### Core Capabilities
- **Japanese Embedding Models**: 5 specialized models for Japanese text processing
- **Multi-Model Analysis**: Compare and analyze results from multiple models
- **Text Generation**: Advanced inference with conversation management
- **Cost Tracking**: Real-time budget monitoring and cost optimization
- **Enterprise Security**: Comprehensive error handling and validation

### Supported Models
- `cl-tohoku/bert-base-japanese-v3` - BERT base model (Tohoku University)
- `sonoisa/sentence-bert-base-ja-mean-tokens-v2` - Sentence-BERT for Japanese
- `colorfulscoop/sbert-base-ja` - Sentence-BERT (ColorfulScoop)
- `rinna/japanese-roberta-base` - RoBERTa base model (rinna)
- `tohoku-nlp/bert-base-japanese-v2` - BERT base v2 (Tohoku NLP)

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- Hugging Face API key
- (Optional) Redis for caching
- (Optional) MySQL for audit logging

## 🛠 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd techsapo
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Hugging Face Configuration
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
HUGGINGFACE_BASE_URL=https://api-inference.huggingface.co

# Server Configuration
PORT=4000
NODE_ENV=development

# Optional: Redis Configuration (Upstash)
UPSTASH_REDIS_URL=your_upstash_redis_url_here
UPSTASH_REDIS_TOKEN=your_upstash_redis_token_here

# Optional: Database Configuration (MySQL)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=techsapo

# Cost Management
MONTHLY_BUDGET_LIMIT=70
COST_ALERT_THRESHOLD=0.8
```

### 4. Build Project
```bash
npm run build
```

### 5. Start Server
```bash
# Development
npm run dev

# Production
npm start

# Using PM2
pm2 start ecosystem.config.js
```

## 📚 API Endpoints

### Health & System
- `GET /health` - Health check
- `GET /info` - System information
- `GET /models` - Available models
- `GET /api/docs` - API documentation

### Embeddings
- `POST /embeddings` - Generate embeddings
- `POST /embeddings/analyze` - Multi-model analysis
- `POST /embeddings/recommend` - Get model recommendation

### Text Generation
- `POST /generate` - Generate text inference
- `POST /conversation/continue` - Continue conversation
- `GET /conversation/:id` - Get conversation history

### Cost Management
- `GET /cost/summary` - Cost summary
- `GET /cost/alerts` - Budget alerts
- `GET /cost/report/daily` - Daily report
- `POST /cost/predict` - Predict cost

## 💡 Usage Examples

### Generate Embeddings
```bash
curl -X POST http://localhost:4000/embeddings \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "text": "システムエラーが発生しました",
    "model": "cl-tohoku/bert-base-japanese-v3"
  }'
```

### Multi-Model Analysis
```bash
curl -X POST http://localhost:4000/embeddings/analyze \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "text": "データベース接続エラー",
    "options": {
      "compareModels": true,
      "includeMetadata": true
    }
  }'
```

### Text Generation
```bash
curl -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "inputs": "PostgreSQLの接続エラーを解決する方法を教えてください",
    "taskType": "premium",
    "parameters": {
      "max_new_tokens": 512,
      "temperature": 0.7
    }
  }'
```

### Cost Prediction
```bash
curl -X POST http://localhost:4000/cost/predict \
  -H "Content-Type: application/json" \
  -d '{
    "model": "cl-tohoku/bert-base-japanese-v3",
    "estimatedInputTokens": 100,
    "taskType": "basic"
  }'
```

## 🏗 Architecture

### Multi-Tier LLM Orchestrator
- **Tier 1**: Claude Code (Total Commander & Router)
- **Tier 2**: Gemini 2.5 Flash + Claude Haiku 3.5 (Basic queries)
- **Tier 3**: Claude Sonnet 4 (Complex analysis)
- **Tier 4**: GPT-5 (High-quality responses)
- **Tier 5**: Claude Opus 4.1 (Critical situations)

### Services Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Express App    │────│ HuggingFace      │────│ Embedding       │
│                 │    │ Client           │    │ Service         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         │              ┌──────────────────┐    ┌─────────────────┐
         │──────────────│ Inference        │────│ Cost Tracking   │
         │              │ Service          │    │ Service         │
         │              └──────────────────┘    └─────────────────┘
         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Error Handler   │────│ Validation       │────│ Rate Limiter    │
│                 │    │ Middleware       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Task Types
- `basic`: Standard processing (default models)
- `premium`: Enhanced processing (tier escalation)
- `critical`: Maximum quality (top-tier models)

### Model Selection Strategy
- **Short text** (<100 chars): Sentence-optimized models
- **Long text** (>1000 chars): Document-optimized models  
- **Technical terms**: Specialized technical models
- **Critical tasks**: Highest quality models

### Cost Management
- Real-time usage tracking
- Budget alerts at configurable thresholds
- Model cost prediction
- Daily/monthly reporting

## 📊 Monitoring & Observability

### Logging
- Structured JSON logging with Winston
- Request/response logging
- Error tracking with stack traces
- Performance metrics

### Health Checks
- Hugging Face API connectivity
- Memory usage monitoring
- Response time tracking
- Cost budget monitoring

### Metrics
- Request count by model
- Average response time
- Cost per request
- Error rates by endpoint

## 🚢 Deployment

### Docker Support
```dockerfile
# Dockerfile included for containerization
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### PM2 Production
```bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem config
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs techsapo-huggingface
```

### Environment Variables
All configuration through environment variables for 12-factor app compliance.

## 🔐 Security

### Features
- Helmet.js security headers
- CORS configuration
- Input sanitization
- Rate limiting
- Request validation
- Error masking in production

### Best Practices
- API key protection
- No sensitive data logging
- Secure error responses
- Content Security Policy

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- Documentation: [API Docs](http://localhost:4000/api/docs)
- Issues: [GitHub Issues](https://github.com/your-repo/techsapo/issues)
- Email: support@techsapo.com

---

**🌟 Enterprise-Grade LLM Orchestrator - Production Ready!**
=======
# techsapo
Technical support tool for IT engineers
>>>>>>> 57119253bf79f503c74695b389e3347c4863e6ab
