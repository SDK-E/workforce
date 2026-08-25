# Workforward tracker

Living follow-up list beyond the current slice. Pick items only when told to.
Slice status lives in docs/viable-release-plan.md; this file tracks user-reported issues and deferred work.

## Confirmed production bugs

### A. Failed model probes emit verification receipts — FIXED this slice
`ModelRepository.recordVerification` now stamps `verifiedAt`/`verificationReceiptId` only for healthy
probes and clears both on failure (stale receipts can no longer outlive their evidence). Covered by
"failed probes clear prior receipts instead of emitting one". Tracked as FIXED-101 in docs/issues.md.

## User-reported runtime issues (2026-08-25)

### B. First-run experience is confusing — FIXED this session
Readiness now explains blocked autonomy with the latest cycle reason and retry cadence; the
executive overview shows a Getting started checklist (configure → verify → describe work → run) and
states that identities persist while containers run only during attempts; guide updated. Tracked as
FIXED in docs/issues.md (BUG-002). Remaining optional idea: bootstrap task on first company creation
(deferred below).

### D. TUI input feels laggy/chaky when typing fast (overlaps, missed letters)
Not reproduced locally yet. Needs terminal/environment details from the operator (terminal app,
locale, Node version, whether overlays were open). Investigate useInput fan-out, overlay stacking,
and Ink render batching before changing anything. Do not guess-fix.

## Slice 2 remaining (release gate)

- Real-Docker boundary suite (test/docker-boundary.test.ts): inspect hardening flags, non-root uid,
  read-only root, private volume persistence across containers, timeout cleanup, secret name-only
  argv, two-attempt refill through ExecaDockerClient, orphan reconcile, stale leases, false-completion
  (exit 0 without evidence stays incomplete), zero leftover managed containers.
- Image gate: local `workforce-agent:0.1.0` measures ~1.83 GB against the 500 MiB limit. Rebuild via
  scripts/build-images.sh, audit layer caches, then `pnpm images:verify-size`. Release blocker.
- Audited egress proof through workforce-egress-proxy (images exist locally).

## Deferred post-release (per viable-release-plan.md)

- Simplified model form (hide advanced registry fields behind an advanced toggle).
- Pre-configured free/local model option (would seed a provider template; requires explicit approval
  because of the no-fictional-seeding rule for production).
- Bootstrap task auto-created on first company creation (chicken-and-egg breaker for first agent run).
- Budget enforcement in the CEO loop (budget field currently informational).
