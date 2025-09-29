# Task Completion Requirements

## Mandatory Steps After Any Code Changes

### 1. Code Quality Verification
```bash
npm run lint              # ESLint check - MUST pass
```
- Fix all linting errors before proceeding
- Ensure code follows TypeScript and project conventions

### 2. Build Verification
```bash
npm run build            # TypeScript compilation check
```
- Verify no compilation errors
- Check that dist/ output is generated correctly

### 3. Test Suite Execution
```bash
npm test                 # Full test suite (5min timeout)
```
- All tests must pass
- Run specific test suites if needed:
  - `npm run test:unit` - Unit tests
  - `npm run test:integration` - Integration tests
  - `npm run test:coverage` - Coverage reports

### 4. Wall-Bounce Analysis Validation
For any changes to LLM integration or wall-bounce logic:
- Test with multiple LLM providers
- Verify consensus scoring works (≥0.7 confidence, ≥0.6 consensus)
- Check cost tracking and budget compliance

### 5. MCP Service Testing
For MCP-related changes:
- Test individual MCP service endpoints
- Verify protocol compliance
- Check integration with vault/context7/cipher services

## Special Requirements

### Environment Configuration
- Never commit API keys or secrets
- Use Vault MCP for sensitive configuration
- Test with proper environment variable setup

### Performance Validation
- Check Prometheus metrics after changes
- Verify no memory leaks or performance degradation
- Test under expected load conditions

### Security Verification
- Validate input sanitization
- Check authentication/authorization flows
- Verify encrypted data handling

## Pre-Commit Checklist
- [ ] Code linted successfully
- [ ] All tests passing
- [ ] Build completes without errors  
- [ ] No sensitive data in commits
- [ ] Documentation updated if needed
- [ ] MCP integration tested (if applicable)
- [ ] Wall-bounce analysis validated (if applicable)

## Critical Failure Scenarios
If any of these fail, DO NOT proceed:
1. Linting errors
2. Test failures
3. Build compilation errors
4. Security vulnerabilities detected
5. Wall-bounce consensus below thresholds

## Deployment Readiness
Before any production deployment:
- Run full monitoring stack locally
- Verify SSL certificate setup
- Test with production-like environment
- Validate backup and recovery procedures