# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `.github/workflows/{ci,codeql}.yml`, `dependabot.yml`, `CODEOWNERS`,
  issue + PR templates, top-level `LICENSE`, `SECURITY.md`,
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.editorconfig`, `.nvmrc`.

### Changed
- `server/src/server.ts` loads `dotenv` BEFORE any other server module
  imports so `npm run dev` no longer needs inline env vars.
- `middleware/auth.ts` and `routes/auth.ts` resolve `JWT_SECRET` lazily
  (fail at first verify, not at module import).

### Removed
- `server/dev.log`, `server/jest-full.log`, `server/test-api-v2.js`,
  `docs/db-validation-results.json` (junk / superseded).
- `server/test-api.js` moved to `server/scripts/smoke-test.js`.

## [0.1.0] - 2026-05-16

Initial public alpha.

### Added
- 13-screen dashboard (Home, Departments, Agents, Business Units,
  Product Studios, Approvals, Audit Log, Risk Center, Finance,
  Workforce, Workflows, Settings, Kill Switch).
- 10-step **first-run Setup Wizard** that configures company identity,
  departments, agents, business unit, budget, database and 9 adapters
  (AI/LLM, Email, LinkedIn, Banking, Accounting, GitHub, Hosting,
  Calendar, Freelancer) and writes the result atomically to
  `server/.env` (`POST /api/setup/save-env`, self-locking after first
  success). Fallback: copy-to-clipboard snippet when backend offline.
- **CompanyContext** wires wizard data live into Sidebar, KPIBar,
  Agents, Departments, Business Units, Finance pages.
- **Ollama integration**: `server/src/adapters/ollamaAdapter.ts` +
  `/api/ai/llm/{health,chat,stream}`. Default model `mistral-nemo:12b`,
  configurable via `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_NUM_CTX`,
  `OLLAMA_NUM_PREDICT`.
- **KI-Suche** sidebar panel: live model badge, SSE streaming response
  with token-rate (tok/s), auto-fallback to local mock NLQ when the
  LLM daemon is unreachable.
- Empty-template pass: all mockData arrays default to `[]`, NaN /
  hardcoded numbers replaced across every page.

[Unreleased]: https://github.com/BEKO2210/The_Company_OS/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/BEKO2210/The_Company_OS/releases/tag/v0.1.0
