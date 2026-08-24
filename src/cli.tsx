import { render } from "ink";
import { dockerStatus } from "./docker-runtime.js";
import { createControlPlaneLogger } from "./observability/control-plane-logger.js";
import { StateStore } from "./storage/state-store.js";
import { WorkforceApp } from "./tui/workforce-app.js";
import { ExecaDockerClient } from "./supervision/docker-client.js";
import { DockerSupervisor } from "./supervision/docker-supervisor.js";
import { EncryptedSecretStore } from "./secrets/encrypted-secret-store.js";
import { resolveAttemptSecrets } from "./secrets/attempt-secret-provider.js";

const store = new StateStore();
store.initialize();

const company =
  store.companies()[0] ??
  store.createCompany({
    id: "default",
    name: "Default Company",
    mission: "Build a dependable company with verified outcomes.",
  });

const docker = await dockerStatus();
const logger = createControlPlaneLogger(store.root);
const secrets = new EncryptedSecretStore(store.root, (event, data) => {
  store.append(event, "secret-store", data.companyId, { ...data });
});
secrets.initialize();
const supervisor = new DockerSupervisor(
  store.attempts,
  new ExecaDockerClient({
    networkName: "workforce-egress-internal",
    proxyUrl: "http://workforce-egress-proxy:3128",
  }),
  store.audit,
  undefined,
  undefined,
  (attempt) => resolveAttemptSecrets(secrets, attempt),
);
const recovery = await supervisor.reconcile();
await supervisor.tick();
logger.info({ companyId: company.id, dockerAvailable: docker.available }, "control plane started");
logger.info(recovery, "supervisor reconciliation completed");

render(<WorkforceApp store={store} docker={docker} initialCompany={company} />);
