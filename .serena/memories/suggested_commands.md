# Essential Development Commands

## Development Workflow
```bash
# Hot reload development
npm run dev              # Uses ts-node-dev for hot reloading

# Build and production
npm run build           # Compile TypeScript to dist/
npm start               # Run production server (requires build first)
```

## Testing Commands
```bash
# Core testing
npm test                # Run all tests (Jest, 5min timeout)
npm run test:watch      # Watch mode for development
npm run test:coverage   # Generate coverage reports (lcov/html)

# Specific test suites
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only

# Code quality
npm run lint            # ESLint code checking
```

## MCP Services
```bash
# Cipher MCP services
npm run cipher-mcp      # Start Cipher MCP memory service
npm run cipher-api      # Start Cipher API mode on port 3002

# Full monitoring stack
./scripts/start-monitoring.sh  # Start complete Prometheus/Grafana stack
```

## Production Operations
```bash
# SSL certificate management
./scripts/renew-certificates.sh     # Manual SSL renewal
./scripts/install-renewal-cron.sh   # Setup 90-day auto-renewal

# Process management
pm2 start ecosystem.config.js       # Start PM2 processes
pm2 monit                           # Monitor processes
pm2 logs techsapo                   # View application logs

# Docker operations
docker-compose -f docker/docker-compose.monitoring.yml up -d  # Monitoring stack
docker-compose -f docker/production/docker-compose.prod.yml up -d  # Production
```

## Task Completion Requirements
After completing any development task, ALWAYS run:
1. `npm run lint` - Code quality check
2. `npm test` - Full test suite 
3. `npm run build` - Verify compilation

## Monitoring Access
- Application: http://localhost:4000
- Prometheus: http://localhost:9090  
- Grafana: http://localhost:3000 (admin/techsapo2024!)
- Metrics endpoint: http://localhost:4000/metrics