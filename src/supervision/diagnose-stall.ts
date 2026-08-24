import type { AttemptClocks, StallDiagnosis } from "./types.js";

export function diagnoseStall(clocks: AttemptClocks, now = Date.now()): StallDiagnosis {
  if (now - clocks.heartbeat > 60_000) return "silent";
  if (now - clocks.meaningful > 5 * 60_000) return "stalled";
  if (now - clocks.acceptance > 15 * 60_000) return "acceptance-stalled";
  return "healthy";
}
