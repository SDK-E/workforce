import { randomUUID } from "node:crypto";
import type { ModelRepository } from "../registries/model-repository.js";
import type { ToolRepository } from "../registries/tool-repository.js";
import { planSandbox } from "../sandbox-planner.js";
import type { TaskRepository } from "./task-repository.js";
import type { AttemptFactory } from "../supervision/attempt-factory.js";
import type { AttemptRecord } from "../supervision/attempt-types.js";
import type { DockerSupervisor } from "../supervision/docker-supervisor.js";
import type { TaskRecord } from "./task-types.js";
import { taskJobRequirements } from "./task-job-requirements.js";
import type { AttemptCapabilityResolver } from "../integrations/attempt-capability-resolver.js";
import { WORKFORCE_MCP_TOKEN_ENV } from "../workforce-mcp/attempt-mcp-token-service.js";

export interface AttemptMcpAccessConfiguration {
  endpoint: string;
}

export class TaskExecutionService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly models: ModelRepository,
    private readonly tools: ToolRepository,
    private readonly attempts: AttemptFactory,
    private readonly supervisor: DockerSupervisor,
    private readonly capabilityResolver?: AttemptCapabilityResolver,
    private readonly mcpAccess?: AttemptMcpAccessConfiguration,
  ) {}

  async start(companyId: string, taskId: string, actorId: string): Promise<AttemptRecord> {
    let task = this.tasks.get(companyId, taskId);
    if (!task) throw new Error(`Unknown task: ${taskId}`);
    if (!task.assigneeId) throw new Error("Task execution requires an assignee");
    const employeeId = task.assigneeId;
    this.tasks.requireExecutableAssignee(companyId, employeeId);
    if (task.status === "ready")
      task = this.tasks.transition(companyId, taskId, "ASSIGN", actorId, "Execution assigned");
    if (task.status !== "assigned")
      throw new Error(`Task must be assigned before execution; current status is ${task.status}`);

    const model = this.resolveModel(task);
    const requirements = taskJobRequirements(task);
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
      ...(this.mcpAccess
        ? { WORKFORCE_MCP_URL: validatedMcpEndpoint(this.mcpAccess.endpoint) }
        : {}),
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
      attemptId: randomUUID(),
      task,
      employeeId,
      sandbox,
      model: model.model,
      secretNames,
      ephemeralSecretNames: this.mcpAccess ? [WORKFORCE_MCP_TOKEN_ENV] : [],
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
}

function validatedMcpEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Workforce MCP endpoint must use HTTP or HTTPS");
  url.username = "";
  url.password = "";
  return url.toString();
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
