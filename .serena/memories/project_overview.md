## Project Purpose
TechSapo is a TypeScript/Node.js service that orchestrates multiple LLM and MCP integrations, exposes REST APIs (Hugging Face, RAG, webhooks), and serves a Gemini-style dashboard with Prometheus/Grafana monitoring links.

## Tech Stack
- Runtime: Node.js >=18 with Express 4
- Language: TypeScript (compiled via `tsc` to `dist/`)
- Tooling: Jest for tests, ESLint, ts-node-dev for local dev
- Integrations: prom-client for metrics, multiple MCP/LLM SDKs, Redis/MySQL clients

## Rough Structure
- `src/index.ts`: main Express server bootstrap, middleware, routes, metrics, static assets
- `src/routes/`, `src/controllers/`, `src/services/`: domain routing, business logic, MCP orchestration
- `src/metrics/`, `src/middleware/`, `src/utils/`: observability, shared helpers, logging
- `public/`: static web assets (dashboard scripts, HTML)
- `tests/`: Jest unit/integration suites
- `scripts/`: operational scripts (service start/stop, monitoring stack)
- `dist/`: build output deployed to production