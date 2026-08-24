import { render } from "ink";
import { dockerStatus } from "./docker-runtime.js";
import { createControlPlaneLogger } from "./observability/control-plane-logger.js";
import { StateStore } from "./storage/state-store.js";
import { WorkforceApp } from "./tui/workforce-app.js";

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
logger.info({ companyId: company.id, dockerAvailable: docker.available }, "control plane started");

render(<WorkforceApp store={store} docker={docker} initialCompany={company} />);
