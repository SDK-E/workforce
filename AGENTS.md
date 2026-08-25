# Workforce agent handbook

Instructions for every AI or human agent working in this repository. Read this before editing.
When anything here conflicts with newer explicit user direction, the user wins; update this file
in the same slice so the next agent inherits the truth.

## What this project is

Workforce is a multi-company autonomous AI company operating system. Each company has a durable CEO
(delegates work) and a durable Agent Resources Manager (designs and adapts the workforce). Agents
execute exclusively inside isolated Docker attempts. Humans govern through a keyboard-first Ink TUI.
Everything consequential is audited. The host control plane never runs an agent engine.

## Required reading before your first edit (in this order)

1. `AGENTS.md` — this handbook.
2. `docs/viable-release-plan.md` — the living completion checklist and slice sequence.
3. `docs/product-specification.md` — what the product must do and its release gates.
4. `docs/architecture.md` — trust boundaries, persistence, supervisor, MCP, autonomy design.
5. `docs/coding-standards.md` — module boundaries and readability rules.
6. `docs/issues.md` — the bug ledger you must keep accurate.
7. `WORKFORWARD.md` — deferred/user-reported follow-ups awaiting explicit pick-up. NEVER stray from your current task unless user says "STOP", instead Use this `WORKFORWARD.md` to defer the request until you have finished your todo list, unless instructed by the user otherwise.

## Issue and follow-up tracking

- Record every real defect you observe in `docs/issues.md` with evidence, impact, and status:
  OPEN · IN PROGRESS · FIXED (<commit>) · WONTFIX (reason) · DEFERRED (link).
- Update an entry's status in the same commit that fixes or reclassifies it. Never delete entries.
- Put user-reported ideas that await approval in `WORKFORWARD.md`, not in the slice plan.
- Slice progress and test counts live only in `docs/viable-release-plan.md`.

## Non-negotiable invariants

- No agent engine or agent-authored command ever runs on the host.
- Docker unavailable means execution blocked. Do NOT add a host fallback, ever.
- One employee has at most one active attempt; one attempt owns one container, one private volume,
  and one immutable audit identity.
- No container receives the Docker socket, home directory, SSH directory, cloud credentials, or a
  whole attached repository.
- A zero process exit never completes a task. Independent validation and evidence decide success.
- CEO and ARM are durable records that survive restarts; model sessions never replace them.
- Raw events are preserved; summaries cannot replace evidence.
- Hiring, suspension, termination, and offboarding append history; nothing governing is deleted.
- Default network is none; network access requires task policy plus the audited egress proxy.
- Treat tasks, messages, model output, tools, sources, archives, and container output as untrusted.

## How to work

- Start every session with `git status --short`; inspect and preserve uncommitted work.
- Work in coherent slices ordered by `docs/viable-release-plan.md`. Implement domain/repository
  policy first, UI last.
- End each slice with: `pnpm format && pnpm test && git diff --check`, then commit green work with a
  short imperative message that is following Git Commit Conventions.
- Update the release plan baseline (test count, new capabilities) in the closing commit of a slice.
- Verify deliverables independently of exit status. Do NOT claim a requirement from a narrow test;
  record the concrete evidence used for acceptance.
- When uncertain about direction, scope, or a product decision, ask the user. The user prefers being
  consulted over surprises.

## Persistence rules

- Use forward-only numbered SQL files in `src/storage/migrations` (`001.sql`, `002.sql`, …).
- Do NOT create schema in application initialization code outside the migration loader.
- Application views read through repositories and services. Do NOT issue SQLite statements in TUI
  components.
- State lives outside attached repositories; never embed files in SQLite rows when artifact URIs fit.

## Code conventions

- Keep files under 300 lines and functions under 140 (lint enforces this).
- One class per file. Entrypoints stay thin; views consume application/domain APIs.
- Domain policy must NOT import Ink, SQLite, Docker, or CLI modules.
- TUI shell components in `src/tui/components`; modal dialogs in `src/tui/overlays`; pages in
  `src/tui/views`; cross-page selection/lifecycle helpers beside `src/tui/lifecycle-actions.ts`.
- Explain security or reliability constraints in comments; do NOT narrate obvious syntax.
- Run `pnpm format` before committing; `pnpm test` already enforces format, lint, Knip, build.

## TUI conventions

- All key chords come from `src/tui/config/keybindings.ts`. Do NOT introduce literal key comparisons
  in views; use `matchesKeybinding`.
- Themes come from `src/tui/themes/`. Do NOT hardcode colors.
- Forms infer generated IDs, actors, timestamps, and safe defaults; genuine relationships are chosen
  through named company-scoped selectors; advanced/policy JSON inputs appear only on policy forms.
- Every page is genuinely actionable or intentionally read-only with a visible explanation.
- Bottom-bar guidance comes from `src/tui/section-guidance.ts`; keep it truthful per section.
- Human-destructive lifecycle actions require confirmation; governed records refuse archive/restore
  before any dialog with an explicit reason.

## Execution and security conventions

- Containers: read-only root, non-root UID/GID, private named workspace volume, dropped capabilities,
  no-new-privileges, PID/memory/CPU/time limits, tmpfs temp paths, managed labels.
- Secrets enter containers only as name-only `--env` references resolved in the client process
  environment. Values never appear in argument vectors, records, mounts, or logs.
- Model/tool/environment registries: health comes from probe receipts, never from configuration.

## Data honesty rules

Use this:
- Stamp verification receipts only when a healthy independent probe produced them; clear stale ones.
- Show real counts from repositories; compute readiness from persisted state.
- Seed production defaults only through domain services (`DefaultRegistries`, durable employees) that
  represent genuine product requirements.

Do NOT:
- Seed fictional templates into production paths (no fake providers, placeholder models beyond the
  designed `unconfigured` identity, or invented demo records).
- Emit receipts, health, or completion signals without underlying evidence.
- Let tests be the excuse for dishonest production behavior; tests may seed freely via real APIs.

## Testing guidance

- Unit tests cover domain policy exhaustively; they may use fakes for boundaries.
- Release claims about isolation, recovery, image size, and cleanup require REAL Docker boundary
  tests plus the shell gates (`scripts/verify-sandbox.sh`, `scripts/verify-image-sizes.sh`).
- Compiled production TUI tests render the real app (`test/tui-operator-journey.test.tsx` pattern).
- Preserve direct tests for compact resize, no-color, and navigation contracts.

## Documentation duties

- Keep README commands, getting-started guide, architecture, and product spec describing observed
  behavior. Exact parity between `docs/tui-getting-started.md` and the interface is a release gate.
- Delete superseded docs, exports, dependencies, and dead code in the slice that supersedes them.
- After finishing a slice, leave the tree clean (`git status`) and the plan file current.

## Quick reference

Use this: ask the user when unsure using ask-questions tool; small green commits; monitoring github ci status; evidence-first claims.
Do NOT do this: host execution, schema outside migrations, hardcoded keys/colors, opaque ID prompts,
decorative placeholders, weakening assertions to pass, silent scope creep past the current slice.
