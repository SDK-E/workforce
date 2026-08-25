import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import type { EnvironmentRecord, ToolRecord } from "../src/registries/registry-types.js";
import { RegistryForm } from "../src/tui/overlays/registry-form.js";

const noop = (): undefined => undefined;
const shared = {
  companyId: "acme",
  health: "healthy" as const,
  updatedAt: "2026-08-25T00:00:00.000Z",
};

test("registry forms prefill selected tools and environments", async () => {
  const tool: ToolRecord = {
    ...shared,
    id: "browser",
    version: "1.0.0",
    provider: "playwright",
    capabilities: ["browse"],
    risk: "medium",
    inputSchema: {},
    outputSchema: {},
    requiredEnvironment: "universal",
    networkPolicy: {},
    secretRequirements: [],
    sandboxProfiles: ["engineering"],
    permissionPolicy: {},
    testReceiptId: "receipt-one",
    auditBehavior: "Log every invocation",
  };
  const environment: EnvironmentRecord = {
    ...shared,
    id: "universal",
    name: "Universal sandbox",
    sandboxImage: "workforce-agent:0.1.0",
    runtime: {},
    buildToolchain: ["pnpm"],
    browser: {},
    networkPolicy: {},
    inputContract: {},
    secretsPolicy: {},
    resourcePolicy: {},
    outputContract: {},
    cleanupPolicy: {},
    supportedProfiles: ["engineering"],
    healthReceiptId: "receipt-two",
  };
  for (const [kind, initial, expected] of [
    ["tool", tool, "browser"],
    ["environment", environment, "universal"],
  ] as const) {
    const view = render(
      <Box width={100} height={30}>
        <RegistryForm
          companyId="acme"
          kind={kind}
          terminalWidth={100}
          initial={initial}
          onSubmit={noop}
          onCancel={noop}
        />
      </Box>,
    );
    await settle();
    assert.match(view.lastFrame() ?? "", new RegExp(`Edit ${kind}`));
    assert.match(view.lastFrame() ?? "", new RegExp(expected));
    view.unmount();
  }
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
