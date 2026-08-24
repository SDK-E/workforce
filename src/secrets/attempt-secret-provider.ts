import type { AttemptRecord } from "../supervision/attempt-types.js";
import type { EncryptedSecretStore } from "./encrypted-secret-store.js";

export function resolveAttemptSecrets(
  store: EncryptedSecretStore,
  attempt: AttemptRecord,
): Record<string, string> {
  return Object.fromEntries(
    attempt.secretNames.map((name) => [
      name,
      store.get(name, {
        companyId: attempt.companyId,
        employeeId: attempt.employeeId,
        taskId: attempt.taskId,
      }),
    ]),
  );
}
