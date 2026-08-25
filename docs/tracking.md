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

### BUG-010 Performance page renders a literal placeholder line (found 2026-08-25 truthfulness audit)
- Evidence: `performance-view.tsx:29` prints "n record evidence-backed …" — a hardcoded string with
  a literal "n", not a count, not derived from anything.
- Impact: decorative/untruthful output on a production page.
- Next: show the real filtered record count or delete the line.

### BUG-011 Fourteen views render their own hardcoded key-hint footers (found 2026-08-25)
- Evidence: inline `<Text dimColor>n create · e edit · [] select …` footers with literal key letters
  in approval-view:28, claim-view:29, agent-resources-view:67, company-view:23,
  business-pipeline-view:20, employee-view:24, automation-view:25, mail-view:19, mcp-server-view:25,
  organization-view:30, incident-view:32, meeting-view:29, strategy-view:29, task-view:25,
  project-integration-view:27. The status bar already derives the same guidance from
  `section-guidance.ts` + `keybindings.ts`; these copies drift and can lie.
- Impact: violates the "bottom-bar guidance comes from section-guidance.ts" convention; if bindings
  or per-section actions change, inline text becomes untruthful.
- Next: delete the inline duplicates (keep the derived bar), or re-derive them from bindingsFor.

### BUG-012 Capacity claims are hardcoded display strings (found 2026-08-25)
- Evidence: runtime-view.tsx:59 "two active containers by default · memory-pressure reduction
  enabled"; executive-overview.tsx:110 "Memory policy: 2 containers default". Actual behavior lives
  in `docker-supervisor.ts:31` (`new CapacityController(2)`); nothing ties the display to it.
- Impact: changing the supervisor limit silently makes both pages lie.
- Next: export the configured limit from one source and derive both displays from it.

### BUG-013 Forms cannot go back, cannot skip prefilled fields (user requirement, found 2026-08-25)
- Evidence: all 22 overlay forms use forward-only `useState(0)` step wizards; Enter advances, there
  is no up-arrow/previous-field navigation, no way to revisit an earlier answer without cancelling;
  empty required fields silently do nothing on Enter (no message).
- User goal: arrows to move back/skip between fields and refill answers; simple auto-filled forms.
- Existing autofill wins to preserve: model engine/priority/roles defaults, automation cron default,
  meeting organizer/participants/time defaults, task risk default.
- Next: shared form-step controller (up = previous field, down/enter = next, values persist for
  re-editing, optional/prefilled fields skippable) adopted by all forms; see OBS-015.

### BUG-014 Raw record IDs rendered instead of names (found 2026-08-25)
- Evidence: task-view assigneeId, claim-view subjectId, business-pipeline-view clientId,
  workflow-timeline-view employeeId/taskId ×2, incident-view employeeId, agent-resources-view
  plan.employeeId, organization-view managerId, conversation-view message.authorId,
  performance-view employeeId/authorId, ceo-office spawnedTaskId, employee-view identity id +
  manager, task-form confirmation ("for <uuid>").
- Impact: opaque UUIDs make the TUI hard to read; contradicts named-selector direction already used
  in forms (commit e2b20bd).
- Next: resolve names in workspace-data layer (employees/clients lists already loaded) and render
  names with ID fallback only when a record was deleted.

### OBS-015 Form plumbing is copy-pasted across overlay files (found 2026-08-25)
- Evidence: identical private `TextField`, `split`, and `activeEmployees` helpers re-implemented in
  strategy-form, meeting-form, and others; step/confirm/footer logic repeated in all 22 forms.
- Impact: every UX improvement (back navigation, skip, error display) must be edited 22 times.
- Next: extract shared field components + step controller as part of BUG-013; delete the copies.

### OBS-016 Advanced inputs appear on general forms (found 2026-08-25)
- Evidence: company edit form asks for raw "Policies and governance (JSON object)"; tool registry
  form has 9 fields including "Network policy (JSON object)"; meeting form asks for an ISO
  timestamp string; governance claim form label says "Subject ID" though it now shows named subject
  options; MCP form exposes credential bindings inline.
- Impact: contradicts the handbook rule that advanced/policy JSON appears only on policy forms.
- Next: move JSON/policy inputs to dedicated policy surfaces or advanced toggles; fix stale labels;
  consider friendly time presets for meetings.

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
