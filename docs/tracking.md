# Workforce tracking ledger

Single source of truth for defects, observations, and deferred/user-reported follow-ups.
Update an entry's status in the same slice that changes it; never delete entries — close them with
the commit that fixed them. Slice status and test counts live in docs/viable-release-plan.md.

Statuses: OPEN · IN PROGRESS · FIXED (<commit>) · WONTFIX (reason) · DEFERRED (reason)

Pick deferred items only when explicitly told to. NEVER stray from your current task to work a
deferred item unless the user says "STOP"; defer new requests here until your todo list is done.

---

## OPEN

### BUG-001 Universal agent image exceeds the 500 MiB release gate
- Evidence: `docker image inspect workforce-agent:0.1.0` reports ~1.83 GB locally; limit is
  524,288,000 bytes (`scripts/verify-image-sizes.sh`). Architecture doc records a prior verified
  build at 471,129,730 bytes, so cleanup regressed or was skipped in the last local build.
- Impact: release blocker for Slice 2; every boundary test inherits the oversized image.
- Next: rebuild via `scripts/build-images.sh`, run `scripts/verify-image-cleanup.sh`, inspect layer
  caches if still large, re-run size gate (`pnpm images:verify-size`).

### BUG-003 TUI input drops letters / overlaps / lags under fast typing
- Reported 2026-08-25 with screenshot; not reproduced locally yet.
- Suspects: useInput fan-out across nested components, overlay stacking repaints, status-message
  state updates per keystroke.
- Next: need reproduction details (terminal app, OS, Node version, whether overlays open, whether
  NO_COLOR). Then profile before editing. Do not guess-fix.

### BUG-004 No real-Docker boundary evidence in test suite
- Evidence: `test/docker-supervisor.test.ts` uses FakeDockerClient exclusively; hardening flags,
  volume persistence, timeout cleanup, secret argv hygiene, refill, orphan reconcile, and
  false-completion have no daemon-backed proof.
- Impact: Slice 2 acceptance cannot be claimed from mocks.
- Next: add `test/docker-boundary.test.ts` covering: hardening flags + non-root uid, read-only root,
  private volume persistence across containers, timeout cleanup, secret name-only argv, two-attempt
  refill through ExecaDockerClient, orphan reconcile, stale leases, false-completion (exit 0 without
  evidence stays incomplete), zero leftover managed containers.

### OBS-005 Model creation form exposes registry-level fields during onboarding
- Evidence: model form requests engine/model/provider plus capabilities, roles, secrets, context
  limit, priority… all before the operator has any working agent.
- Impact: friction; contradicts "easy and seamless" goal.
- Next: minimal first-run variant with advanced fields hidden behind an explicit toggle.

### BUG-010 Performance page renders a literal placeholder line — FIXED (2026-08-25)
- Was: `performance-view.tsx` printed "n record evidence-backed …" — a hardcoded string with a
  literal "n", not a count.
- Fix: renders `{visible.length} evidence-backed <kind> records` from the filtered record list.
- Covered by test/tui-truthfulness.test.tsx.

### BUG-011 Fourteen views render their own hardcoded key-hint footers — FIXED (2026-08-25)
- Was: inline `<Text dimColor>n create · e edit · [] select …` footers with literal key letters in
  approval, claim, agent-resources, company, business-pipeline, employee, automation,
  conversation, mail, mcp-server, organization, incident, meeting, strategy, task, and
  project-integration views duplicated the derived status bar and drifted from it.
- Fix: inline duplicates deleted; the single source of guidance remains `section-guidance.ts` via
  the status bar. Covered by test/tui-truthfulness.test.tsx (task view assertion).

### BUG-012 Capacity claims are hardcoded display strings — FIXED (2026-08-25)
- Was: runtime-view said "two active containers by default" and executive overview said "Memory
  policy: 2 containers default" while real behavior lives in `docker-supervisor.ts`.
- Fix: exported `DEFAULT_AGENT_CONCURRENCY` from capacity-controller.ts; supervisor and both TUI
  displays derive from it ("up to N containers, reduced under memory pressure"). Covered by
  test/tui-truthfulness.test.tsx.

### BUG-013 Forms cannot go back, cannot skip prefilled fields — FIXED (2026-08-25)
- Was: all overlay forms used forward-only step wizards; Enter advanced, there was no arrow
  navigation, no way to revisit an earlier answer without cancelling, and empty required fields
  silently ignored Enter.
- Fix: shared `useFormSteps` controller (`src/tui/use-form-steps.ts`) adopted by all wizard forms.
  ↑ goes back to the previous field (values persist for re-editing), ↓ skips forward past a field,
  ← goes back from select/choice steps where ↑/↓ move the option list, empty required fields show
  an explicit inline message instead of doing nothing. Truthful footers are derived from
  `bindingsFor` per step type. Covered by test/tui-form-navigation.test.tsx and the operator
  journey.

### BUG-014 Raw record IDs rendered instead of names — FIXED (2026-08-25)
- Was: tasks, claims, engagements, workflow events, incidents, ARM decisions/plans, organization
  managers, conversation authors, performance records, CEO-office spawned tasks, approvals, mail
  parties, meetings, and strategy owners displayed raw UUIDs or opaque IDs.
- Fix: `nameDirectory` (`src/tui/names.ts`) resolves employees, task objectives, clients, and all
  governance subject kinds to persisted names; unknown IDs fall back to the raw value so display
  never invents a name. Wired through workspace views; task confirmations now name the assignee.
  Covered by view-level test updates and test/tui-agent-resources.test.tsx.

### OBS-015 Form plumbing is copy-pasted across overlay files — resolved by BUG-013 work (2026-08-25)
- Was: identical `TextField`, `split`, and `activeEmployees` helpers re-implemented per form;
  step/confirm/footer logic repeated in every overlay.
- Resolution: shared `useFormSteps` controller, `formFooter`, `splitList` now live in
  `src/tui/use-form-steps.ts`; per-file copies were deleted during the conversion.

### OBS-016 Advanced inputs appear on general forms — PARTIALLY addressed (2026-08-25)
- Done: company policies field relabeled "(advanced JSON object)" and tolerates an empty value;
  MCP secret/credential fields marked optional; claim form's stale "Subject ID" label corrected to
  "Subject"; meeting time field explains that Enter keeps the pre-filled time; task/hire forms use
  short required-field labels.
- Remaining (deferred): tool/environment registry JSON fields are the policy surface itself and
  stay on the registry form until a dedicated policy editor exists; a friendly meeting-time picker
  (presets instead of ISO) awaits explicit pick-up.

## FIXED

### FIXED-101 Failed model probes emitted verification receipts (2026-08-25)
- Was: `ModelRepository.recordVerification` stamped `verifiedAt` + `verificationReceiptId` even when
  `healthy=false`; unavailable engines carried receipt-shaped records and stale receipts survived a
  later failed re-verification.
- Fix: receipt fields are stamped only for healthy probes and cleared otherwise; failure keeps
  `health="unavailable"` + classified `failureClass`. Test: failed probe clears prior receipts.
- Commit: 10bce95

### FIXED-102 Executive overview advertised a hardcoded deliverable count (2026-08-25)
- Was: `executive-overview.tsx` rendered literal "0 deliverables ready".
- Fix: real validated-artifact count passed from workspace data. Commit 883ee48.

### FIXED-103 Lifecycle keys opened confirmations that could only fail (2026-08-25)
- Was: approvals, hiring proposals, models, tools, environments produced archive/restore targets;
  d/u opened a confirmation then threw store errors.
- Fix: pre-dialog refusal with explicit reasons (governed decision workflow / retained execution
  history / manage via Edit and verification). Commit 883ee48.

### FIXED-104 Thread lifecycle existed only in repositories (2026-08-25)
- Was: `ThreadRepository.setStatus` reachable from nothing but tests; thread statuses were decorative.
- Fix: Conversations lists rooms and threads as one row set; d/u archives/restores threads; edit on a
  thread explains supported actions. Commits 883ee48.

### FIXED-105 First operating cycle blocked forever without actionable guidance (2026-08-25)
- Was: blocked autonomy rendered "blocked · 60s cadence" with no reason; no first-run guidance after
  company creation; operator could not tell why nothing executed.
- Fix: readiness autonomy check renders the latest CEO cycle failureReason ("Blocked · <reason> ·
  retrying every Ns"); executive overview shows a Getting started checklist until model configured,
  verified, work described, and a deliverable produced; overview and CEO office state that
  identities persist while containers run only during attempts.
- Commit: d3972ea

## Observations (accepted behavior, revisit only if requirements change)

### OBS-006 Mail markRead has no TUI key
Service supports read state; page shows status column but cannot flip it. Viable-release scope keeps
mail lifecycle to archive/restore. Add a key only if operators ask.

### OBS-007 Employee ARCHIVE transition unreachable from TUI
Termination preserves all records; hard-archive of terminated employees stays an ARM/offboarding
concern. Intentional per architecture doc.

### OBS-008 Company budget defaults to 0 and is not enforced
CEO loop ignores budget today. Field is informational until enforcement ships (deferred list below).

### OBS-009 Docker Desktop reports engine-only containers between attempts
CEO/ARM are durable employees; attempt containers exist only while tasks execute. Correct per design;
guide documents it. TUI surfaces repeat this so operators stop expecting persistent agent containers.

## Deferred / user-reported follow-ups (pick up only when told)

### D1. Simplified model form
Hide advanced registry fields (capabilities, roles, secrets, context limit, priority) behind an
advanced toggle; first-run variant asks engine/model/provider only. See OBS-005 and BUG-013.

### D2. Pre-configured free/local model option
Would seed a provider template; requires explicit user approval because of the
no-fictional-seeding rule for production defaults.

### D3. Bootstrap task auto-created on first company creation
Chicken-and-egg breaker for the first agent run; needs product approval before implementation.

### D4. Budget enforcement in the CEO loop
Budget field currently informational (OBS-008).

### D5. Audited egress proof through workforce-egress-proxy
Images exist locally; boundary evidence still owed as part of Slice 2.
