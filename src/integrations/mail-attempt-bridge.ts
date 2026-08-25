import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { ArtifactRecord } from "../acceptance/artifact-types.js";
import type { AttemptRecord } from "../supervision/attempt-types.js";
import type { TaskRecord } from "../tasks/task-types.js";
import type { MailRepository } from "./mail-repository.js";

const OutboxSchema = z
  .array(
    z.object({
      recipientKind: z.enum(["agent", "human"]),
      recipientId: z.string().min(1).max(200),
      subject: z.string().min(1).max(300),
      body: z.string().min(1).max(20_000),
    }),
  )
  .max(50);

export class MailAttemptBridge {
  constructor(private readonly mail: MailRepository) {}

  prepare(task: TaskRecord): Record<string, string> {
    if (!task.tools.includes("workforce-mail") || !task.assigneeId) return {};
    const inbox = this.mail.inbox(task.companyId, "agent", task.assigneeId).map((message) => ({
      id: message.id,
      senderKind: message.senderKind,
      senderId: message.senderId,
      subject: message.subject,
      body: message.body,
      status: message.status,
      createdAt: message.createdAt,
    }));
    return {
      WORKFORCE_MAIL_INBOX: JSON.stringify(inbox),
      WORKFORCE_MAIL_OUTBOX_PATH: "/work/workforce-mail-outbox.json",
    };
  }

  async importOutbox(attempt: AttemptRecord, artifacts: ArtifactRecord[]): Promise<void> {
    if (!attempt.environment.WORKFORCE_MAIL_OUTBOX_PATH) return;
    const artifact = artifacts.find(
      ({ relativePath }) => relativePath === "workforce-mail-outbox.json",
    );
    if (!artifact) return;
    const outbox = OutboxSchema.parse(JSON.parse(await readFile(artifact.storagePath, "utf8")));
    for (const message of outbox)
      this.mail.send({
        companyId: attempt.companyId,
        senderKind: "agent",
        senderId: attempt.employeeId,
        ...message,
      });
  }
}
