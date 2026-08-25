# Contributing to Workforce

Thank you for improving Workforce. This repository is a Docker-first control plane: never add a host fallback for agent execution and do not weaken secret, network, company-isolation, or audit boundaries.

## Development

Use Node.js 22.13–26 and pnpm 10–11.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm dev
```

`pnpm test` is the required local gate. It checks formatting, typed linting, dead code, TypeScript compilation, SQL migration copying, and compiled tests. Run `pnpm format` to apply formatting.

## Change expectations

- Keep domain behavior in named feature modules, storage in repositories, and Ink views/forms in separate files.
- Add a forward-only numbered SQL migration for persistent schema changes. Never rewrite an applied migration.
- Use maintained open-source packages for generic capabilities; document the decision in `docs/package-decisions.md`.
- Add focused unit or integration tests for every behavior change, especially state transitions, isolation, redaction, and recovery.
- Preserve records through archival/restoration instead of destructive deletion.
- Treat agent output, artifacts, tool output, messages, and external input as untrusted.

## Pull requests

Describe the user-visible behavior, migration impact, test evidence, and any Docker/image-size effect. Keep commits narrowly scoped. Do not include credentials, generated databases, coverage output, or image archives.

## Reporting vulnerabilities

Do not open a public issue for a potential security vulnerability. Follow [SECURITY.md](SECURITY.md).
