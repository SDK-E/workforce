import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import { ModelForm, parseModelInput } from "../src/tui/overlays/model-form.js";

test("model form prepopulates a selected registry entry", () => {
  const view = render(
    <Box width={100} height={30}>
      <ModelForm
        terminalWidth={100}
        initial={{
          companyId: "acme",
          id: "opencode-primary",
          engine: "opencode",
          model: "openai/gpt-5",
          provider: "openai",
          capabilities: ["tools"],
          supportedRoles: ["engineering"],
          secretRequirements: [],
          contextLimit: null,
          freePreferred: false,
          localModel: false,
          priority: 80,
          health: "unknown",
          verifiedAt: null,
          verificationReceiptId: null,
          failureClass: null,
          updatedAt: "2026-08-25T00:00:00.000Z",
        }}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />
    </Box>,
  );
  assert.match(view.lastFrame() ?? "", /Edit model registry entry/);
  assert.match(view.lastFrame() ?? "", /opencode/);
  view.unmount();
});

test("first-run model input defaults advanced registry fields", () => {
  const input = parseModelInput(["opencode", "zhipu/glm-5", "zhipu"], false, "fixed-id");
  assert.deepEqual(
    [input.priority, input.capabilities, input.supportedRoles, input.secretRequirements],
    [60, [], ["general"], []],
  );
  assert.equal(input.id, "fixed-id");
});

test("advanced fields stay available behind an explicit toggle", async () => {
  const view = render(
    <Box width={100} height={30}>
      <ModelForm
        terminalWidth={100}
        minimal
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />
    </Box>,
  );
  const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 20));
  await settle();
  assert.match(view.lastFrame() ?? "", /Essential setup/);
  view.stdin.write("\x01");
  await settle();
  assert.doesNotMatch(view.lastFrame() ?? "", /Essential setup/);
  assert.match(view.lastFrame() ?? "", /1\/7/);
  view.unmount();
});
