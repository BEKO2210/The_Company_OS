# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do NOT file a public GitHub issue for a security vulnerability.**

Send a private report to **belkis.aslani@gmail.com** with:

- A clear description of the issue and the impact (what an attacker can do)
- Steps to reproduce (proof-of-concept, exact commit hash, environment)
- Suggested mitigation if you have one

You should receive an acknowledgement within **72 hours**. We aim to ship a fix
or a clearly communicated mitigation within **14 days** of confirmation for
high-severity issues.

If the vulnerability concerns a third-party dependency, please also notify the
upstream maintainers and reference the CVE if one exists.

## Hardening already in place

- JWT auth with bcrypt(12) password hashes (`server/src/utils/crypto.ts`).
- Per-endpoint RBAC + auth middleware (`server/src/middleware/{auth,rbac}.ts`).
- Input sanitization + security headers (`server/src/middleware/security.ts`).
- Rate limiting on auth endpoints (`server/src/middleware/rateLimit.ts`).
- Append-only audit log with hash-chain entries.
- Kill-switch (4 levels) gated behind explicit confirmation flows.
- Atomic `.env` writer that backs up before overwriting and self-locks
  after first run (`server/src/routes/setup.ts`).
- All third-party adapters default to **mock mode** until credentials are
  explicitly configured via the setup wizard or `server/.env`.

For the full security/architecture deep-dive see [`docs/SECURITY.md`](docs/SECURITY.md).

## Out of scope

- Issues that require physical access to the machine.
- Findings against `MOCK_MODE=true` fake data (no real impact).
- Reports generated solely by automated scanners without a working reproducer.
