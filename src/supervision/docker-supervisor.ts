import { randomUUID } from "node:crypto";
import { totalmem, freemem } from "node:os";
import type { AuditRepository } from "../storage/audit-repository.js";
import { AttemptRepository } from "./attempt-repository.js";
import type { AttemptRecord, AttemptRequest, AttemptResult } from "./attempt-types.js";
import { CapacityController } from "./capacity-controller.js";
import type { DockerClient } from "./docker-client.js";
import type { ResourceSnapshot } from "./types.js";

export class DockerSupervisor {
  readonly ownerId = randomUUID();
  private readonly running = new Map<string, Promise<void>>();
  private stopped = false;

  constructor(
    readonly attempts: AttemptRepository,
    private readonly docker: DockerClient,
    private readonly audit: AuditRepository,
    private readonly capacity = new CapacityController(2),
    private readonly resources: (running: number) => ResourceSnapshot = (running) => ({
      totalMemoryMb: Math.floor(totalmem() / 1_048_576),
      availableMemoryMb: Math.floor(freemem() / 1_048_576),
      running,
    }),
  ) {}

  enqueue(request: AttemptRequest): AttemptRecord {
    if (this.stopped) throw new Error("Supervisor emergency stop is active");
    return this.attempts.enqueue(request);
  }

  async tick(): Promise<void> {
    if (this.stopped) return;
    if (!(await this.docker.available())) {
      for (const attempt of this.attempts.queued(100))
        this.attempts.setStatus(attempt.id, "infrastructure-blocked", {
          reason: "Docker unavailable",
        });
      return;
    }
    const decision = this.capacity.decide(this.resources(this.running.size));
    for (const attempt of this.attempts.queued(decision.availableSlots)) this.launch(attempt);
  }

  async waitForIdle(): Promise<void> {
    while (this.running.size > 0) await Promise.all([...this.running.values()]);
  }

  async emergencyStop(actorId: string): Promise<void> {
    this.stopped = true;
    const active = this.attempts.active();
    await Promise.all(active.map((attempt) => this.docker.stop(attempt.containerName)));
    for (const attempt of active)
      this.attempts.setStatus(attempt.id, "interrupted", {
        reason: `Emergency stop by ${actorId}`,
      });
    for (const companyId of new Set(active.map(({ companyId }) => companyId)))
      this.audit.append("supervisor.emergency-stop", actorId, companyId, {
        attempts: active.map(({ id }) => id),
      });
  }

  async reconcile(): Promise<{ recoveredLeases: string[]; removedOrphans: string[] }> {
    if (!(await this.docker.available())) return { recoveredLeases: [], removedOrphans: [] };
    const recoveredLeases = this.attempts.clearExpiredLeases();
    const expected = new Set(this.attempts.active().map(({ containerName }) => containerName));
    const managed = await this.docker.managedContainers();
    const removedOrphans = managed.filter((name) => !expected.has(name));
    await Promise.all(removedOrphans.map((name) => this.docker.removeContainer(name)));
    return { recoveredLeases, removedOrphans };
  }

  private launch(attempt: AttemptRecord): void {
    this.attempts.acquire(attempt, this.ownerId);
    const operation = this.run(attempt).finally(async () => {
      this.running.delete(attempt.id);
      if (!this.stopped) await this.tick();
    });
    this.running.set(attempt.id, operation);
  }

  private async run(attempt: AttemptRecord): Promise<void> {
    try {
      await this.docker.createVolume(attempt.sandbox.workspace.name);
      this.attempts.setStatus(attempt.id, "running");
      const result = await this.docker.start(attempt.sandbox, attempt.id, attempt.command);
      this.recordResult(attempt, result);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown Docker failure";
      this.attempts.setStatus(attempt.id, "infrastructure-blocked", { reason });
      await this.docker.stop(attempt.containerName);
    }
  }

  private recordResult(attempt: AttemptRecord, result: AttemptResult): void {
    this.attempts.event(attempt.id, "container.output", {
      stdout: result.stdout,
      stderr: result.stderr,
    });
    if (result.timedOut)
      this.attempts.setStatus(attempt.id, "timed-out", {
        exitCode: result.exitCode,
        reason: "Attempt timeout",
      });
    else
      this.attempts.setStatus(attempt.id, result.exitCode === 0 ? "succeeded" : "failed", {
        exitCode: result.exitCode,
        ...(result.exitCode === 0 ? {} : { reason: "Container exited non-zero" }),
      });
  }
}
