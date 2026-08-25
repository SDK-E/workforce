import { JobRequirementsSchema, type JobRequirements } from "../domain.js";
import type { ModelRepository } from "../registries/model-repository.js";
import type { ToolRepository } from "../registries/tool-repository.js";
import { planSandbox } from "../sandbox-planner.js";
import type { TaskRepository } from "../storage/task-repository.js";
import type { AttemptFactory } from "../supervision/attempt-factory.js";
import type { AttemptRecord } from "../supervision/attempt-types.js";
import type { DockerSupervisor } from "../supervision/docker-supervisor.js";
import type { TaskRecord } from "./task-types.js";
import type { AttemptCapabilityResolver } from "../integrations/attempt-capability-resolver.js";

export class TaskExecutionService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly models: ModelRepository,
    private readonly tools: ToolRepository,
    private readonly attempts: AttemptFactory,
    private readonly supervisor: DockerSupervisor,
    private readonly capabilityResolver?: AttemptCapabilityResolver,
  ) {}

  async start(companyId: string, taskId: string, actorId: string): Promise<AttemptRecord> {
    let task = this.tasks.get(companyId, taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    if (!task.assigneeId) throw new Error("Task execution requires an assignee");
    const employeeId = task.assigneeId;
    if (task.status === "ready")
      task = this.tasks.transition(companyId, taskId, "ASSIGN", actorId, "Execution assigned");
    if (task.status !== "assigned")
      throw new Error(`Task must be assigned before execution; current status is ${task.status}`);

    const model = this.resolveModel(task);
    const requirements = this.requirements(task);
    const sandbox = planSandbox(requirements);
    if (sandbox.rejectedCapabilities.length > 0)
      throw new Error(`Task capabilities rejected: ${sandbox.rejectedCapabilities.join(", ")}`);
    const capabilities = this.capabilityResolver?.resolve(task, sandbox.engine) ?? {
      environment: {},
      secretNames: [],
    };
    const toolchains = resolveToolchainBundles(task);
    const environment = {
      ...capabilities.environment,
      ...(toolchains.length > 0
        ? {
            WORKFORCE_REQUIRED_TOOLCHAINS: toolchains.join(","),
            WORKFORCE_TOOLCHAIN_COMMAND: `workforce-toolchain install ${toolchains.join(" ")}`,
          }
        : {}),
    };
    const secretNames = [
      ...new Set([...this.resolveToolSecrets(task), ...capabilities.secretNames]),
    ];
    const request = this.attempts.create({
      task,
      employeeId,
      sandbox,
      model: model.model,
      secretNames,
      environment,
    });
    const attempt = this.supervisor.enqueue(request);
    this.tasks.transition(companyId, taskId, "START", actorId, `Queued attempt ${attempt.id}`);
    await this.supervisor.tick();
    return attempt;
  }

  private resolveModel(task: TaskRecord) {
    const requested = [...task.modelPolicy.preferredModels, ...task.modelPolicy.fallbackModels];
    const candidates = this.models
      .list(task.companyId, 100)
      .filter(({ engine }) => task.modelPolicy.enginePreference.includes(engine))
      .filter(
        ({ model, health, verifiedAt }) =>
          model !== "unconfigured" &&
          (health === "healthy" || health === "degraded") &&
          verifiedAt !== null,
      )
      .sort(
        (left, right) =>
          preference(requested, left.id, left.model) - preference(requested, right.id, right.model),
      );
    const selected = candidates[0];
    if (!selected) throw new Error("No verified configured model is available for this task");
    return selected;
  }

  private resolveToolSecrets(task: TaskRecord): string[] {
    return [
      ...new Set(
        task.tools.filter(isBuiltInTool).flatMap((id) => {
          const tool = this.tools.get(task.companyId, id);
          if (!tool) throw new Error(`Unknown task tool: ${id}`);
          if (tool.health === "unavailable") throw new Error(`Task tool is unavailable: ${id}`);
          return tool.secretRequirements;
        }),
      ),
    ].sort();
  }

  private requirements(task: TaskRecord): JobRequirements {
    const capability = new Set([...task.capabilities, ...task.tools]);
    const mode = networkMode(task.networkPolicy.mode);
    return JobRequirementsSchema.parse({
      id: `job-${task.id}`,
      title: task.objective.slice(0, 200),
      objective: task.objective,
      risk: task.risk,
      dataSensitivity: task.dataSensitivity,
      capabilities: {
        filesystemWrite: true,
        shell: capability.has("shell") || capability.has("engineering"),
        sourceControl: capability.has("git") || capability.has("github-cli"),
        browser: capability.has("browser"),
        publicInternet: mode !== "inference-only",
        packageInstall: capability.has("package-manager") || capability.has("engineering"),
        buildTools: task.tools.filter((tool) => tool.startsWith("build:")).map(afterColon),
        languages: task.capabilities.filter((item) => item.startsWith("language:")).map(afterColon),
      },
      inputs: task.inputs,
      outputs: task.outputs,
      network: {
        mode,
        allowedHosts: stringArray(task.networkPolicy.allowedHosts),
        reason: stringValue(task.networkPolicy.reason, "Remote model inference"),
        approvedBy: optionalString(task.networkPolicy.approvedBy),
      },
      resources: {
        cpu: numberValue(task.resourcePolicy.cpu, 1),
        memoryMb: numberValue(task.resourcePolicy.memoryMb, 768),
        pids: numberValue(task.resourcePolicy.pids, 128),
        timeoutSeconds: numberValue(task.resourcePolicy.timeoutSeconds, 1800),
      },
      enginePreference: task.modelPolicy.enginePreference,
      acceptanceCriteria: task.acceptanceCriteria,
    });
  }
}

function resolveToolchainBundles(task: TaskRecord): string[] {
  const requested = new Set([...task.capabilities, ...task.tools]);
  const bundles = new Set<string>();
  const mappings: [string, string][] = [
    ["language:python", "python"],
    ["language:php", "php"],
    ["framework:laravel", "laravel"],
    ["framework:symfony", "symfony"],
    ["language:go", "go"],
    ["language:rust", "rust"],
    ["document", "document"],
    ["office", "office"],
    ["pdf", "pdf"],
    ["image", "image"],
    ["audio", "audio-video"],
    ["video", "audio-video"],
    ["browser", "browser"],
    ["integration:beads", "beads"],
  ];
  for (const [capability, bundle] of mappings) if (requested.has(capability)) bundles.add(bundle);
  return [...bundles].sort();
}

function isBuiltInTool(id: string): boolean {
  return !id.startsWith("mcp:") && !id.startsWith("integration:");
}

function preference(requested: string[], id: string, model: string): number {
  const index = requested.findIndex((value) => value === id || value === model);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

function networkMode(
  value: unknown,
): "inference-only" | "search-only" | "allowlisted" | "audited-internet" {
  return value === "search-only" || value === "allowlisted" || value === "audited-internet"
    ? value
    : "inference-only";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function afterColon(value: string): string {
  return value.slice(value.indexOf(":") + 1);
}
