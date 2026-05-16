# Contributing to The Company OS

Thanks for your interest. This repo runs the dashboard for an AI-native
holding (frontend) plus its API (backend). Both live in the same repo for
faster iteration during alpha.

## Quick start

```bash
# 1. Clone
git clone https://github.com/BEKO2210/The_Company_OS.git
cd The_Company_OS

# 2. Frontend
npm install
npm run dev        # http://localhost:5173

# 3. Backend (separate terminal)
cd server
npm install
npm run dev        # http://localhost:3001 - .env auto-read
```

The setup wizard opens automatically on first visit and writes the server's
`.env` for you. If `localhost:11434` (Ollama) is reachable the KI-Suche
panel goes live with your local model.

## Project layout

See [`PROJECT_MAP.md`](PROJECT_MAP.md) — it is kept up to date for every
structural change and is the canonical reference.

## Branching & commits

- `main` is always green (CI passes). Land features via PR.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat(scope): …`, `fix(scope): …`, `docs: …`, `chore: …`, `refactor: …`.
  The scope hints which area you touched: `wizard`, `ai`, `server`, `ui`, etc.
- Keep commits small and focused. One logical change per commit.

## Code style

- **TypeScript strict** is on for both frontend and backend. No `any` unless
  there is no other option — comment why if you use it.
- **Imports**: use the `@/` alias for frontend (`@/components/...`), relative
  `./...` for backend.
- **UI tokens**: never hard-code colors. Use the Tailwind tokens listed in
  `tailwind.config.js` (e.g. `bg-bg-tertiary`, `text-accent-teal`).
- **Empty-state copy**: stay consistent (`Keine X`, `Noch keine Y`).
- **ASCII over umlauts** in user-facing strings (we already normalised
  everything once — don't bring `ä/ö/ü/ß` back).

## Running tests

```bash
# Backend
cd server && npm test

# Frontend (no tests yet - PRs welcome)
```

## Pull requests

1. Open a draft PR early if the change is non-trivial.
2. Fill in the PR template (test plan + security checklist).
3. CI (`.github/workflows/ci.yml`) must be green.
4. CodeQL (`.github/workflows/codeql.yml`) must show no new high-severity
   findings.
5. One approving review from a CODEOWNER lands the change.

## Security

Do **not** report vulnerabilities via public issues. See
[`SECURITY.md`](SECURITY.md) for the private disclosure flow.

## License

By contributing you agree your work is released under the [MIT License](LICENSE).
