import { render } from "ink";
import { dockerStatus } from "./docker-runtime.js";
import { createControlPlaneLogger } from "./observability/control-plane-logger.js";
import { StateStore } from "./storage/state-store.js";
import { WorkforceRoot } from "./tui/workforce-root.js";
import { ExecaDockerClient } from "./supervision/docker-client.js";
import { DockerSupervisor } from "./supervision/docker-supervisor.js";
import { EncryptedSecretStore } from "./secrets/encrypted-secret-store.js";
import { resolveAttemptSecrets } from "./secrets/attempt-secret-provider.js";
import { ArtifactPipeline } from "./acceptance/artifact-pipeline.js";
import { TaskExecutionService } from "./tasks/task-execution-service.js";
import { CeoOperatingLoop } from "./autonomy/ceo-operating-loop.js";
import { AttemptCapabilityResolver } from "./integrations/attempt-capability-resolver.js";
import { AutomationService } from "./automations/automation-service.js";
import { MailAttemptBridge } from "./integrations/mail-attempt-bridge.js";
import { DockerMcpProbeRunner, McpHealthVerifier } from "./integrations/mcp-health-verifier.js";
import { ArmOperatingLoop } from "./autonomy/arm-operating-loop.js";
import { DockerModelProbeRunner, ModelVerifier } from "./registries/model-verifier.js";

const store = new StateStore();
store.initialize();

const docker = await dockerStatus();
const logger = createControlPlaneLogger(store.root);
const secrets = new EncryptedSecretStore(store.root, (event, data) => {
  store.append(event, "secret-store", data.companyId, { ...data });
});
secrets.initialize();
const dockerClient = new ExecaDockerClient({
  networkName: "workforce-egress-internal",
  proxyUrl: "http://workforce-egress-proxy:3128",
});
const artifactPipeline = new ArtifactPipeline(store.root, store.artifacts, dockerClient);
const mailBridge = new MailAttemptBridge(store.mail);
const mcpVerifier = new McpHealthVerifier(store.mcpServers, new DockerMcpProbeRunner(), (server) =>
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
const modelVerifier = new ModelVerifier(store.models, new DockerModelProbeRunner(), (model) =>
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
const supervisor = new DockerSupervisor(
  store.attempts,
  dockerClient,
  store.audit,
  undefined,
  undefined,
  (attempt) => resolveAttemptSecrets(secrets, attempt),
  artifactPipeline,
  store.executionEvidence,
  { process: (attempt, artifacts) => mailBridge.importOutbox(attempt, artifacts) },
);
const taskExecution = new TaskExecutionService(
  store.tasksRepository,
  store.models,
  store.tools,
  store.attemptFactory,
  supervisor,
  new AttemptCapabilityResolver(store.mcpServers, store.projectIntegrations, mailBridge),
);
const operatingLoop = new CeoOperatingLoop(store, store.autonomy, taskExecution);
const automationService = new AutomationService(store, taskExecution);
const armOperatingLoop = new ArmOperatingLoop(store);
const recovery = await supervisor.reconcile();
await supervisor.tick();
await operatingLoop.tick();
await automationService.tick();
armOperatingLoop.tick();
setInterval(() => {
  void operatingLoop.tick().catch((error: unknown) => {
    logger.error({ error }, "CEO operating cycle failed");
  });
}, 10_000);
setInterval(() => {
  void automationService.tick().catch((error: unknown) => {
    logger.error({ error }, "Automation scheduler tick failed");
  });
}, 10_000);
setInterval(() => {
  try {
    armOperatingLoop.tick();
  } catch (error) {
    logger.error({ error }, "ARM operating cycle failed");
  }
}, 10_000);
logger.info({ dockerAvailable: docker.available }, "control plane started");
logger.info(recovery, "supervisor reconciliation completed");

render(
  <WorkforceRoot
    store={store}
    docker={docker}
    onEmergencyStop={() => supervisor.emergencyStop("human")}
    onStartTask={async (companyId, taskId) => {
      await taskExecution.start(companyId, taskId, "human");
    }}
    onVerifyMcp={async (companyId, serverId) => {
      await mcpVerifier.verify(companyId, serverId, "human");
    }}
    onVerifyModel={async (companyId, modelId) => {
      await modelVerifier.verify(companyId, modelId, "human");
    }}
  />,
);
