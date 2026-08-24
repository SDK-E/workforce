export interface ResourceSnapshot {
  totalMemoryMb: number;
  availableMemoryMb: number;
  running: number;
}
export interface CapacityDecision {
  limit: number;
  availableSlots: number;
  pressure: "normal" | "elevated" | "critical";
  reason: string;
}
type ProgressClock =
  | "heartbeat"
  | "engine"
  | "tool"
  | "meaningful"
  | "checkpoint"
  | "deliverable"
  | "acceptance";
export type AttemptClocks = Record<ProgressClock, number>;
export type StallDiagnosis = "healthy" | "silent" | "stalled" | "acceptance-stalled";
