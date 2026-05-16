# Code Ownership

> Companion to [`.github/CODEOWNERS`](../.github/CODEOWNERS).
> The file in `.github/` is the **machine-readable** version that GitHub uses
> to auto-request reviewers; this document is the **human-readable** version
> that explains *why* and *who* for new contributors.

## Maintainers

| Handle | Role | Areas | Contact |
| --- | --- | --- | --- |
| [@BEKO2210](https://github.com/BEKO2210) | Founder + sole maintainer | All areas (alpha phase) | <belkis.aslani@gmail.com> |

The project is in early alpha. Until additional maintainers join, every PR
gets routed to `@BEKO2210`. The areas below are listed so that future
contributors know which directory belongs to which capability.

## Area map

### Frontend (`/src/**`)

| Path | Topic | Notes |
| --- | --- | --- |
| `src/App.tsx` | Router shell + CompanyProvider wrap | Must stay tiny. |
| `src/main.tsx` | Vite entry, PWA bootstrap | |
| `src/components/wizard/**` | Setup wizard (10 steps) | Adding a new step also needs an entry in `adapterSpecs.ts` and a wizard-flow screenshot. |
| `src/components/ai/**` | KI-Suche + AIInsights + prediction charts | Streaming, history, model badge. |
| `src/components/Layout.tsx` `Sidebar.tsx` `KPIBar.tsx` | Chrome | Edits here ripple across every page - run a screenshot smoke. |
| `src/components/ui/**` | shadcn-style primitives | Do not edit by hand for cosmetic tweaks - prefer adjusting the `tailwind.config.js` tokens. |
| `src/components/mobile/**` | Mobile-specific surfaces (< 768px) | |
| `src/pages/**` | One file per route | When emptying or wiring a page, update [`PROJECT_MAP.md`](../PROJECT_MAP.md) section 4. |
| `src/data/{models,mockData}.ts` | TS interfaces + empty-template defaults | mockData is deliberately empty after v0.1.0. |
| `src/contexts/CompanyContext.tsx` | React Context for wizard config | |
| `src/lib/storage.ts` | localStorage typed wrapper | Backwards-compatible merges only. |
| `src/lib/adapterSpecs.ts` | Single source of truth for adapters | Used by both the wizard UI and the .env serializer. |
| `src/lib/envSerializer.ts` | CompanyConfig -> .env body | |
| `src/lib/companyAdapter.ts` | derive\* helpers (Agent / Department / BU / Finance) | |
| `src/ai/**` | Local NLQ mock + LLM client | Pure TS, no React. |
| `src/pwa/**` | Service worker + offline storage + push | |
| `src/hooks/**` `src/lib/utils.ts` | Tiny helpers | |

### Backend (`/server/src/**`)

| Path | Topic | Notes |
| --- | --- | --- |
| `server/src/server.ts` | Boot + graceful shutdown | Loads `dotenv` *first* so middleware sees env. |
| `server/src/app.ts` | Express composition | New routes get mounted here. Order matters for `/api/ai/llm/*` vs `/api/ai/*`. |
| `server/src/routes/setup.ts` | First-run-locked /api/setup/save-env | Self-locks on `SETUP_COMPLETED=true`. |
| `server/src/routes/llm.ts` | Unauth /api/ai/llm/{health,chat,stream} | Local-only by design. |
| `server/src/routes/ai.ts` | Auth-protected mock NLQ + analyzers | |
| `server/src/routes/{auth,agents,departments,businessUnits,productStudios,approvals,auditLog,risks,workflows,finance,workforce,settings,killSwitch,dashboard}.ts` | Domain routes | RBAC via `middleware/rbac.ts`. |
| `server/src/middleware/{auth,rbac,security,rateLimit,errorHandler,audit}.ts` | Cross-cutting | `auth.ts` resolves `JWT_SECRET` lazily on first verify. |
| `server/src/adapters/**` | External system adapters | All inherit `BaseAdapter`, default to mock until credentials are set. Currently: `ollama`, `email`, `linkedIn`, `banking`, `accounting`, `gitHub`, `hosting`, `calendar`, `freelancerPlatform`. |
| `server/src/services/**` | Business services (agent, approval, audit, killSwitch, risk, workflow, adapter) | |
| `server/src/db/{schema.sql,schema-tenant.sql,seed.ts,connection.ts}` | better-sqlite3 schema + seed | |
| `server/src/killSwitch/**` | Hard-kill + redLine override | Sensitive - review with extra care. |
| `server/src/workflowEngine/**` | Workflow step runner | |
| `server/src/ai/**` | Server-side NLQ + summarizer + predictor | Mirrors `/src/ai/*` and may be consolidated later. |
| `server/src/tenant/**` | Multi-tenant scaffolding | Not wired yet. |
| `server/src/utils/{crypto,validators}.ts` | bcrypt + zod schemas | |

### Infrastructure

| Path | Topic | Notes |
| --- | --- | --- |
| `.github/workflows/ci.yml` | Build + tests on push/PR | Frontend + backend in parallel jobs. |
| `.github/workflows/codeql.yml` | Weekly security + quality scan | |
| `.github/dependabot.yml` | Weekly npm + actions updates | Grouped per-area. |
| `.github/CODEOWNERS` | Machine-readable owners | This file documents *why*. |
| `.github/ISSUE_TEMPLATE/**`, `PULL_REQUEST_TEMPLATE.md`, `FUNDING.yml` | Community templates | |
| `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md` | Top-level legal + community | |
| `tailwind.config.js`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `postcss.config.js`, `components.json` | Build / lint / styling | |
| `server/jest.config.js`, `server/tsconfig.test.json` | Test config | |
| `server/.env.example` | env template | The real `.env` is gitignored and written by the wizard. |
| `server/tests/.env.test` | Test fixture | Lives under tests/ so static scanners recognize it as a fixture. |

### Documentation (`/docs/**`)

| Path | Topic |
| --- | --- |
| `docs/ARCHITECTURE.md` | System architecture |
| `docs/SECURITY.md` | Security concept (the deep-dive; public reporting flow lives in top-level `SECURITY.md`). |
| `docs/AGENT_REGISTRY.md`, `docs/DEPARTMENTS.md`, `docs/BUSINESS_UNITS.md` | Domain catalog |
| `docs/WORKFLOWS.md`, `docs/OPERATING_MODEL.md`, `docs/GOVERNANCE.md`, `docs/COMPLIANCE.md` | Process + governance |
| `docs/FINANCE_MODEL.md`, `docs/HUMAN_WORKFORCE.md` | Domain modules |
| `docs/QA_PLAN.md`, `docs/QA_REPORT_*.md` | QA artefacts |
| `docs/ROADMAP.md`, `docs/RUN_LOG.md` | Planning + log |
| `docs/screenshots/**` | Curated PNGs for the README + docs. Ad-hoc dev screenshots are gitignored. |
| `docs/CODEOWNERS.md` | **This file**. |

## Review expectations

- **One CODEOWNER approval** is required before merge.
- **Security-tagged PRs** (anything touching `server/src/middleware/`, `server/src/killSwitch/`, `server/src/adapters/`, `SECURITY.md`, `.env*`) get extra scrutiny: at minimum check the SECURITY checklist in `.github/PULL_REQUEST_TEMPLATE.md`.
- **CI green** is non-negotiable. CodeQL findings of severity ≥ MEDIUM block merge.
- **No new TypeScript `any`** without a comment explaining why.

## Adding a new owner

1. Push a PR that:
   - Adds the new `@handle` to the relevant section in `.github/CODEOWNERS`.
   - Adds the handle + areas to the **Maintainers** table above.
2. The new owner self-merges after one existing owner approves.
3. Update `SECURITY.md` reporting address if the new owner is also a security contact.
