import type { CompanyRuntime } from "../autonomy/autonomy-types.js";
import type { DockerStatus } from "../docker-runtime.js";
import type { EnvironmentRecord, ModelRecord } from "../registries/registry-types.js";
import type { AttemptRecord } from "../supervision/attempt-types.js";

interface ReadinessCheck {
  id: string;
  label: string;
  status: "ready" | "warning" | "blocked";
  detail: string;
}

export interface ExecutionReadiness {
  ready: boolean;
  checks: ReadinessCheck[];
  activeAttempts: number;
  queuedAttempts: number;
}

export function executionReadiness(input: {
  docker: DockerStatus;
  environments: EnvironmentRecord[];
  models: ModelRecord[];
  attempts: AttemptRecord[];
  runtime: CompanyRuntime | undefined;
}): ExecutionReadiness {
  const environment = input.environments.find(({ id }) => id === "universal");
  const configuredModels = input.models.filter(({ model }) => model !== "unconfigured");
  const verifiedModels = configuredModels.filter(
    ({ health, verifiedAt, verificationReceiptId }) =>
      health === "healthy" && verifiedAt !== null && verificationReceiptId !== null,
  );
  const checks: ReadinessCheck[] = [
    check(
      "docker",
      "Docker daemon",
      input.docker.available ? "ready" : "blocked",
      input.docker.available
        ? `Available${input.docker.version ? ` · ${input.docker.version}` : ""}`
        : (input.docker.reason ?? "Docker is unavailable"),
    ),
    check(
      "environment",
      "Universal sandbox",
      !environment || environment.health === "unavailable"
        ? "blocked"
        : environment.health === "healthy" && environment.healthReceiptId
          ? "ready"
          : "warning",
      environment
        ? `${environment.sandboxImage} · ${environment.health}${environment.healthReceiptId ? " · receipt recorded" : " · verification pending"}`
        : "Universal environment is not configured",
    ),
    check(
      "model-configured",
      "Inference model",
      configuredModels.length ? "ready" : "blocked",
      configuredModels.length
        ? `${configuredModels.length} configured model${configuredModels.length === 1 ? "" : "s"}`
        : "Configure a provider/model under Models & engines",
    ),
    check(
      "model-verified",
      "Model verification",
      verifiedModels.length ? "ready" : "blocked",
      verifiedModels.length
        ? `${verifiedModels.length} independently verified model${verifiedModels.length === 1 ? "" : "s"}`
        : "No healthy model has a verification receipt",
    ),
    check(
      "autonomy",
      "Autonomous operation",
      input.runtime?.enabled
        ? input.runtime.state === "blocked"
          ? "warning"
          : "ready"
        : "warning",
      input.runtime?.enabled
        ? `${input.runtime.state} · ${input.runtime.cadenceSeconds}s cadence`
        : "Autonomy is stopped",
    ),
  ];
  return {
    ready: checks.every(({ status }) => status !== "blocked"),
    checks,
    activeAttempts: input.attempts.filter(({ status }) => ["starting", "running"].includes(status))
      .length,
    queuedAttempts: input.attempts.filter(({ status }) => status === "queued").length,
  };
}

function check(
  id: string,
  label: string,
  status: ReadinessCheck["status"],
  detail: string,
): ReadinessCheck {
  return { id, label, status, detail };
}
