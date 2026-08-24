export interface CircuitState {
  failures: number;
  openUntil: number | null;
}

export class EngineCircuitBreaker {
  private readonly states = new Map<string, CircuitState>();

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 60_000,
  ) {}

  canAttempt(engineModel: string, now = Date.now()): boolean {
    const state = this.states.get(engineModel);
    return !state?.openUntil || state.openUntil <= now;
  }

  success(engineModel: string): void {
    this.states.set(engineModel, { failures: 0, openUntil: null });
  }

  failure(engineModel: string, now = Date.now()): CircuitState {
    const failures = (this.states.get(engineModel)?.failures ?? 0) + 1;
    const state = {
      failures,
      openUntil: failures >= this.failureThreshold ? now + this.cooldownMs : null,
    };
    this.states.set(engineModel, state);
    return state;
  }

  select(candidates: string[], now = Date.now()): string {
    const available = candidates.find((candidate) => this.canAttempt(candidate, now));
    if (!available) throw new Error("All compatible engine/model circuits are open");
    return available;
  }
}
