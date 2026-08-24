import type { CapacityDecision, ResourceSnapshot } from "./types.js";

export class CapacityController {
  constructor(readonly configuredLimit = 2) {
    if (!Number.isInteger(configuredLimit) || configuredLimit < 1 || configuredLimit > 4) {
      throw new Error("Agent concurrency must be between 1 and 4");
    }
  }

  decide(snapshot: ResourceSnapshot): CapacityDecision {
    const ratio =
      snapshot.totalMemoryMb === 0 ? 0 : snapshot.availableMemoryMb / snapshot.totalMemoryMb;
    const pressure = ratio < 0.08 ? "critical" : ratio < 0.18 ? "elevated" : "normal";
    const limit = pressure === "normal" ? this.configuredLimit : 1;
    return {
      limit,
      availableSlots: Math.max(0, limit - snapshot.running),
      pressure,
      reason:
        pressure === "normal"
          ? "Configured capacity available"
          : `Concurrency reduced under ${pressure} memory pressure`,
    };
  }
}
