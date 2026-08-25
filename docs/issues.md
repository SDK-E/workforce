# Workforce issue ledger

Running log of real issues observed while developing or operating Workforce.
Every entry records evidence and status. Update an entry's status in the same slice that changes it;
never delete entries — close them with the commit that fixed them.

Statuses: OPEN · IN PROGRESS · FIXED (<commit>) · WONTFIX (reason) · DEFERRED (link)

---

## OPEN

### BUG-001 Universal agent image exceeds the 500 MiB release gate
- Evidence: `docker image inspect workforce-agent:0.1.0` reports ~1.83 GB locally; limit is
  524,288,000 bytes (`scripts/verify-image-sizes.sh`). Architecture doc records a prior verified
  build at 471,129,730 bytes, so cleanup regressed or was skipped in the last local build.
- Impact: release blocker for Slice 2; every boundary test inherits the oversized image.
- Next: rebuild via `scripts/build-images.sh`, run `scripts/verify-image-cleanup.sh`, inspect layer
  caches if still large, re-run size gate.

### BUG-002 First operating cycle blocks forever without actionable guidance
- Evidence chain: autonomy defaults enabled=1 cadence=60s (`autonomy-repository.ensure`);
  seeded models are `model: "unconfigured"` placeholders; `TaskExecutionService.resolveModel`
  throws "No verified configured model"; `CeoOperatingLoop.runCompany` catches and finishes each
  cycle `blocked`; operator sees "blocked · 60s cadence" with no reason and no next step.
- Impact: first-run appears broken; retry loop never converges until manual model configuration.
- Next: surface latest-cycle failureReason wherever runtime state renders; add first-run checklist
  to executive overview; consider bootstrap task (tracked separately, see WORKFORWARD.md).

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
- Next: add `test/docker-boundary.test.ts` per plan in docs/viable-release-plan.md Slice 2.

### OBS-005 Model creation form exposes registry-level fields during onboarding
- Evidence: model form requests engine/model/provider plus capabilities, roles, secrets, context
  limit, priority… all before the operator has any working agent.
- Impact: friction; contradicts "easy and seamless" goal.
- Next (deferred until core flow works): advanced-field toggle or minimal first-run variant.

## FIXED

### FIXED-101 Failed model probes emitted verification receipts (2026-08-25)
- Was: `ModelRepository.recordVerification` stamped `verifiedAt` + `verificationReceiptId` even when
  `healthy=false`; unavailable engines carried receipt-shaped records and stale receipts survived a
  later failed re-verification.
- Fix: receipt fields are stamped only for healthy probes and cleared otherwise; failure keeps
  `health="unavailable"` + classified `failureClass`. Test: failed probe clears prior receipts.
- Commit: (pending — this slice)

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

## Observations (accepted behavior, revisit only if requirements change)

### OBS-006 Mail markRead has no TUI key
Service supports read state; page shows status column but cannot flip it. Viable-release scope keeps
mail lifecycle to archive/restore. Add a key only if operators ask.

### OBS-007 Employee ARCHIVE transition unreachable from TUI
Termination preserves all records; hard-archive of terminated employees stays an ARM/offboarding
concern. Intentional per architecture doc.

### OBS-008 Company budget defaults to 0 and is not enforced
CEO loop ignores budget today. Field is informational until enforcement ships (WORKFORWARD.md deferred
list).

### OBS-009 Docker Desktop reports engine-only containers between attempts
CEO/ARM are durable employees; attempt containers exist only while tasks execute. Correct per design;
guide documents it. TUI surfaces should repeat this so operators stop expecting persistent agent
containers.
