import { ArtifactPipeline } from "../acceptance/artifact-pipeline.js";
import { ArmOperatingLoop } from "../autonomy/arm-operating-loop.js";
import { CeoOperatingLoop } from "../autonomy/ceo-operating-loop.js";
import { AutomationService } from "../automations/automation-service.js";
import { AttemptCapabilityResolver } from "../integrations/attempt-capability-resolver.js";
import { MailAttemptBridge } from "../integrations/mail-attempt-bridge.js";
import { DockerMcpProbeRunner, McpHealthVerifier } from "../integrations/mcp-health-verifier.js";
import { DockerModelCatalogRunner } from "../engines/model-catalog.js";
import { createControlPlaneLogger } from "../observability/control-plane-logger.js";
import { DockerModelProbeRunner, ModelVerifier } from "../registries/model-verifier.js";
import { resolveAttemptSecrets } from "../secrets/attempt-secret-provider.js";
import { EncryptedSecretStore } from "../secrets/encrypted-secret-store.js";
import { StateStore } from "../storage/state-store.js";
import { ExecaDockerClient } from "../supervision/docker-client.js";
import { DockerSupervisor } from "../supervision/docker-supervisor.js";
import type { AttemptRecord } from "../supervision/attempt-types.js";
import { TaskExecutionService } from "../tasks/task-execution-service.js";
import { AttemptMcpTokenService } from "../workforce-mcp/attempt-mcp-token-service.js";

export class ControlPlaneRuntime {
  readonly store: StateStore;
  readonly taskExecution: TaskExecutionService;
  readonly mcpVerifier: McpHealthVerifier;
  readonly modelVerifier: ModelVerifier;
  readonly modelCatalog = new DockerModelCatalogRunner();
  readonly supervisor: DockerSupervisor;
  readonly attemptMcpTokens = new AttemptMcpTokenService();
  readonly secrets: EncryptedSecretStore;
  private readonly timers: NodeJS.Timeout[] = [];
  private readonly logger;
  private readonly ceoLoop: CeoOperatingLoop;
  private readonly armLoop: ArmOperatingLoop;
  private readonly automations: AutomationService;

  constructor(stateRoot: string, mcpEndpoint?: string) {
    this.store = new StateStore(stateRoot);
    this.store.initialize();
    this.logger = createControlPlaneLogger(this.store.root);
    const secrets = new EncryptedSecretStore(this.store.root, (event, data) => {
      this.store.append(event, "secret-store", data.companyId, { ...data });
    });
    secrets.initialize();
    this.secrets = secrets;
    const docker = new ExecaDockerClient({
      networkName: "workforce-egress-internal",
      proxyUrl: "http://workforce-egress-proxy:3128",
    });
    const artifacts = new ArtifactPipeline(this.store.root, this.store.artifacts, docker);
    const mail = new MailAttemptBridge(this.store.mail);
    this.mcpVerifier = new McpHealthVerifier(
      this.store.mcpServers,
      new DockerMcpProbeRunner(),
      (server) =>
        Object.fromEntries(
          server.secretRequirements.map((name) => [
            name,
            secrets.get(name, {
              companyId: server.companyId,
              employeeId: "arm",
              taskId: `mcp-health:${server.id}`,
            }),
          ]),
        ),
    );
    this.modelVerifier = new ModelVerifier(
      this.store.models,
      new DockerModelProbeRunner(),
      (model) =>
        Object.fromEntries(
          model.secretRequirements.map((name) => [
            name,
            secrets.get(name, {
              companyId: model.companyId,
              employeeId: "arm",
              taskId: `model-health:${model.id}`,
            }),
          ]),
        ),
    );
    this.supervisor = new DockerSupervisor(
      this.store.attempts,
      docker,
      this.store.audit,
      undefined,
      undefined,
      (attempt) => resolveAttemptSecrets(secrets, attempt),
      artifacts,
      this.store.executionEvidence,
      { process: (attempt, records) => mail.importOutbox(attempt, records) },
      (attempt: AttemptRecord) => this.attemptMcpTokens.secretProvider(attempt),
      (attempt: AttemptRecord) => {
        this.attemptMcpTokens.revokeAttempt(attempt.id);
      },
    );
    this.taskExecution = new TaskExecutionService(
      this.store.tasksRepository,
      this.store.models,
      this.store.tools,
      this.store.attemptFactory,
      this.supervisor,
      new AttemptCapabilityResolver(this.store.mcpServers, this.store.projectIntegrations, mail),
      mcpEndpoint ? { endpoint: mcpEndpoint } : undefined,
    );
    this.ceoLoop = new CeoOperatingLoop(this.store, this.store.autonomy, this.taskExecution);
    this.automations = new AutomationService(this.store, this.taskExecution);
    this.armLoop = new ArmOperatingLoop(this.store);
  }

  async start(): Promise<void> {
    const recovery = await this.supervisor.reconcile();
    await this.supervisor.tick();
    await this.runCycles();
    this.timers.push(setInterval(() => void this.runCycles(), 10_000));
    this.logger.info(recovery, "supervisor reconciliation completed");
    this.logger.info("control plane daemon started");
  }

  async close(): Promise<void> {
    for (const timer of this.timers) clearInterval(timer);
    await this.supervisor.waitForIdle();
    this.secrets.close();
    this.store.close();
  }

  private async runCycles(): Promise<void> {
    try {
      await this.ceoLoop.tick();
      await this.automations.tick();
      this.armLoop.tick();
    } catch (error) {
      this.logger.error({ error }, "control-plane cycle failed");
    }
  }
}
