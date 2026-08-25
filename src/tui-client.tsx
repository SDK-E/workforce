import { readFileSync } from "node:fs";
import { render } from "ink";
import { StateStore } from "./storage/state-store.js";
import { ControlApiClient } from "./runtime/control-api-client.js";
import { WorkforceRoot } from "./tui/workforce-root.js";

const stateRoot = process.env.WORKFORCE_STATE_ROOT ?? "/var/lib/workforce";
const endpoint = process.env.WORKFORCE_CONTROL_URL ?? "http://workforce-engine:7789";
const token = readFileSync(`${stateRoot}/control-api-token`, "utf8").trim();
const response = await fetch(`${endpoint}/health`, {
  headers: { authorization: `Bearer ${token}` },
});
if (!response.ok) throw new Error("Workforce daemon is not ready; run pnpm start first");
const api = new ControlApiClient(endpoint, token);
const store = new StateStore(stateRoot);
store.initialize();

const application = render(
  <WorkforceRoot
    store={store}
    docker={{ available: true, version: "managed by workforce-engine" }}
    onEmergencyStop={() => api.emergencyStop()}
    onStartTask={(companyId, taskId) => api.startTask(companyId, taskId)}
    onVerifyMcp={(companyId, serverId) => api.verifyMcp(companyId, serverId)}
    onVerifyModel={(companyId, modelId) => api.verifyModel(companyId, modelId)}
  />,
);
await application.waitUntilExit();
store.close();
