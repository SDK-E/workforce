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
const supervisor = new DockerSupervisor(
  store.attempts,
  dockerClient,
  store.audit,
  undefined,
  undefined,
  (attempt) => resolveAttemptSecrets(secrets, attempt),
  artifactPipeline,
  store.executionEvidence,
);
const taskExecution = new TaskExecutionService(
  store.tasksRepository,
  store.models,
  store.tools,
  store.attemptFactory,
  supervisor,
  new AttemptCapabilityResolver(store.mcpServers, store.projectIntegrations),
);
const operatingLoop = new CeoOperatingLoop(store, store.autonomy, taskExecution);
const automationService = new AutomationService(store, taskExecution);
const recovery = await supervisor.reconcile();
await supervisor.tick();
await operatingLoop.tick();
await automationService.tick();
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
  />,
);
