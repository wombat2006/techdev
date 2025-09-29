# Repository Guidelines

This guide orients new contributors to TechSapo's MCP wall-bounce service and highlights day-to-day expectations for building, testing, and reviewing changes.

## Project Structure & Module Organization
- Runtime TypeScript lives in `src/`; `index.ts` boots Express, `controllers/` manage HTTP flows, `services/` talk to MCP backends, and `metrics/` exposes Prometheus endpoints.
- Shared logic belongs in `utils/`, types in `types/`, configuration helpers in `config/`, and static assets in `public/`.
- Tests mirror runtime folders under `tests/` (unit, integration, performance, security). Compiled output lands in `dist/`, documentation in `docs/`, containers and automation in `docker/` and `scripts/`.

## Build, Test, and Development Commands
- `npm run dev` starts the hot-reload dev server with ts-node-dev.
- `npm run build` compiles TypeScript to `dist/` via `tsc`; `npm start` runs the built service.
- `npm run lint` enforces ESLint on `src/**/*.ts`.
- `npm run test`, `npm run test:unit`, and `npm run test:integration` execute Jest suites; use `npm run test:coverage` before review.
- `npm run cipher-mcp` and `npm run cipher-api` launch secured MCP tooling when working with protected endpoints.

## Coding Style & Naming Conventions
- Use TypeScript with 2-space indentation, `prefer-const`, and `no-var`; keep modules cohesive and favor dependency injection.
- File names are kebab-case (`wall-bounce-service.ts`), classes/interfaces PascalCase, functions and instances camelCase.
- Run `npm run lint` before pushing; format manual edits to satisfy the repo's ESLint profile.

## Testing Guidelines
- Jest handles all suites; expect deterministic assertions and fixtures from `tests/data`.
- Name specs `*.test.ts` and group them alongside mirrored runtime directories.
- Preserve the 100% coverage target by running `npm run test:coverage` and inspecting `coverage/lcov-report`.

## Commit & Pull Request Guidelines
- Follow Conventional Commit syntax with scoped prefixes (e.g., `feat(mcp):`, `test:`, `🔒 SECURITY:`); keep subjects ≤72 characters and group related changes.
- Pull requests should summarize intent, list validation commands (lint, tests, build), link issues, and include relevant screenshots or logs.
- Flag breaking changes and document rollout or rollback steps when touching MCP integrations or deployment assets.

## Security & Configuration Tips
- Copy `.env.example` when provisioning secrets; never commit populated `.env` files.
- When updating cryptography or MCP credentials, document outcomes in `docs/` and sync helper scripts in `scripts/`.
- Align deployment manifests with `docker/` assets and keep monitoring endpoints declared in `metrics/`.
