# Code Style and Conventions

## TypeScript Configuration
- **Target**: ES2022
- **Module system**: CommonJS
- **Strict mode**: Enabled
- **Declaration files**: Generated with source maps
- **Decorators**: Experimental decorators enabled

## Code Style Rules
- **ESLint**: Configured with TypeScript parser
- **Naming conventions**: 
  - camelCase for variables and functions
  - PascalCase for classes and interfaces
  - UPPER_SNAKE_CASE for constants
- **File organization**: Logical separation by feature/service
- **Imports**: ES6 module syntax with esModuleInterop

## Project Structure Conventions
```
src/
├── config/          # Environment and configuration
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── services/        # Business logic and integrations
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── metrics/         # Prometheus metrics
└── mcp-servers/     # MCP server implementations
```

## Critical Code Guidelines

### LLM Provider Integration
- **Never use direct Anthropic API**: Always use Claude Code SDK
- **OpenAI via Codex only**: Direct OpenAI API calls forbidden
- **Error handling**: Comprehensive error handling for all LLM calls
- **Rate limiting**: Implement proper rate limiting

### Security Practices
- **Environment variables**: Use Vault MCP for sensitive data
- **Input validation**: Sanitize all user inputs
- **API keys**: Never commit secrets, use encrypted storage
- **Authentication**: Implement proper auth middleware

### Performance Considerations
- **Caching**: Use Redis for frequently accessed data
- **Async/await**: Proper async handling throughout
- **Memory management**: Monitor and optimize for low memory usage
- **Metrics**: Track performance with Prometheus

### Testing Standards
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Coverage**: Aim for high test coverage
- **Mocking**: Use proper mocking for external services
- **Property-based**: Use fast-check for complex validation

## Documentation Requirements
- **JSDoc comments**: For public APIs and complex functions
- **README updates**: Keep documentation current
- **Type definitions**: Comprehensive TypeScript typing