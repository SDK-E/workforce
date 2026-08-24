import { randomUUID } from "node:crypto";
import type { AcceptanceResult, CriterionResult } from "../acceptance/types.js";
import type { WorkforceDatabase } from "./database.js";

export class ExecutionEvidenceRepository {
  constructor(private readonly database: WorkforceDatabase) {}

  rawEvent(attemptId: string, source: string, payload: Record<string, unknown>): void {
    this.database.connection
      .prepare("INSERT INTO raw_attempt_events VALUES (NULL,?,?,?,?)")
      .run(attemptId, new Date().toISOString(), source, JSON.stringify(payload));
  }

  activity(input: {
    companyId: string;
    taskId: string;
    attemptId: string;
    kind: string;
    summary: string;
    evidenceIds?: string[];
  }): string {
    const id = randomUUID();
    this.database.connection
      .prepare("INSERT INTO normalized_activities VALUES (?,?,?,?,?,?,?,?)")
      .run(
        id,
        input.companyId,
        input.taskId,
        input.attemptId,
        input.kind,
        input.summary,
        JSON.stringify(input.evidenceIds ?? []),
        new Date().toISOString(),
      );
    return id;
  }

  decision(input: {
    companyId: string;
    taskId: string;
    attemptId: string;
    result: AcceptanceResult;
    criteria: CriterionResult[];
    decidedBy: string;
  }): string {
    const id = randomUUID();
    this.database.connection
      .prepare("INSERT INTO acceptance_decisions VALUES (?,?,?,?,?,?,?,?,?)")
      .run(
        id,
        input.companyId,
        input.taskId,
        input.attemptId,
        input.result.accepted ? 1 : 0,
        JSON.stringify(input.result.reasons),
        JSON.stringify(input.criteria),
        input.decidedBy,
        new Date().toISOString(),
      );
    return id;
  }
}
