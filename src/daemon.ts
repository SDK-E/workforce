import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ControlApi } from "./runtime/control-api.js";
import { ControlPlaneRuntime } from "./runtime/control-plane-runtime.js";
import { WorkforceMcpHttpService } from "./workforce-mcp/workforce-mcp-http-service.js";

const stateRoot = process.env.WORKFORCE_STATE_ROOT ?? resolve(process.cwd(), ".workforce");
const mcpEndpoint = process.env.WORKFORCE_MCP_URL ?? "http://workforce-engine:7788/mcp";
const runtime = new ControlPlaneRuntime(stateRoot, mcpEndpoint);
const controlToken = durableToken(resolve(stateRoot, "control-api-token"));
const mcp = new WorkforceMcpHttpService(
  runtime.store,
  runtime.attemptMcpTokens,
  {
    host: "0.0.0.0",
    port: 7788,
    allowedHosts: ["workforce-engine"],
  },
  runtime.secrets,
);
const api = new ControlApi(runtime, controlToken, "0.0.0.0", 7789);

await mcp.start();
await api.start();
await runtime.start();

for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void shutdown();
  });

async function shutdown(): Promise<void> {
  await api.close();
  await mcp.close();
  await runtime.supervisor.emergencyStop("system-shutdown");
  await runtime.close();
  process.exit(0);
}

function durableToken(path: string): string {
  if (existsSync(path)) return readFileSync(path, "utf8").trim();
  const token = randomBytes(32).toString("base64url");
  writeFileSync(path, token, { mode: 0o600, flag: "wx" });
  return token;
}
