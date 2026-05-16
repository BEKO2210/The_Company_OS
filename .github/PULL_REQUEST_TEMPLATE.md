<!-- Thanks for contributing to The Company OS. -->

## Summary

<!-- 1-3 sentences. What does this PR change and why. -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (existing functionality changes)
- [ ] Docs only
- [ ] Tooling / CI
- [ ] Refactor / cleanup (no behavior change)

## Test plan

<!-- How did you verify this? List commands, manual steps, screenshots. -->

- [ ] `npm run build` (frontend) passes
- [ ] `cd server && npm run build` passes
- [ ] `cd server && npm test` passes
- [ ] Manually verified in browser (note which pages)

## Security checklist

- [ ] No new secrets committed (check `git diff` for keys / passwords)
- [ ] If adding an adapter: defaults to `mockMode=true` until credentials are present
- [ ] Auth + RBAC respected on any new route
- [ ] Inputs validated with `zod` (or equivalent)

## Related issues

Closes #
