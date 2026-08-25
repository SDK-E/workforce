import assert from "node:assert/strict";
import test from "node:test";
import type { Server } from "node:http";
import { ControlApi } from "../src/runtime/control-api.js";
import { ControlApiClient } from "../src/runtime/control-api-client.js";

const TOKEN = "test-token";

function fakeRuntime(catalog: (engine: string) => Promise<string[]>) {
  return {
    supervisor: { emergencyStop: () => Promise.resolve() },
    taskExecution: { start: () => Promise.resolve() },
    mcpVerifier: { verify: () => Promise.resolve() },
    modelVerifier: { verify: () => Promise.resolve() },
    modelCatalog: { catalog },
  };
}

function endpoint(api: ControlApi): string {
  const server = (api as unknown as { server?: Server }).server;
  const address = server?.address();
  if (!address || typeof address === "string") throw new Error("server is not listening");
  return `http://127.0.0.1:${address.port}`;
}

test("model catalog endpoint serves discovered models behind the bearer token", async () => {
  const runtime = fakeRuntime((engine) => {
    if (engine !== "kilo") return Promise.reject(new Error("unsupported engine"));
    return Promise.resolve(["kilo/aion-labs/aion-2.0", "kilo/z-ai/glm-5.2"]);
  });
  const api = new ControlApi(runtime as never, TOKEN, "127.0.0.1", 0);
  await api.start();
  try {
    const base = endpoint(api);
    const client = new ControlApiClient(base, TOKEN);
    assert.deepEqual(await client.discoverModels("kilo"), [
      "kilo/aion-labs/aion-2.0",
      "kilo/z-ai/glm-5.2",
    ]);
    await assert.rejects(client.discoverModels("opencode"), /Model catalog unavailable/);
    const unauthenticated = await fetch(`${base}/model-catalog?engine=kilo`);
    assert.equal(unauthenticated.status, 401);
  } finally {
    await api.close();
  }
});
