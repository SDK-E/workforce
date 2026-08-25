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

test("model identifier step offers discovered models with manual fallback", async (t) => {
  const submitted: { model: string }[] = [];
  const view = render(
    <Box width={100} height={40}>
      <ModelForm
        terminalWidth={100}
        minimal
        onDiscoverModels={(engine) =>
          Promise.resolve(
            engine === "opencode" ? ["opencode/openai/gpt-5", "opencode/z-ai/glm-5.3"] : [],
          )
        }
        onSubmit={(input) => {
          submitted.push(input);
        }}
        onCancel={() => undefined}
      />
    </Box>,
  );
  t.after(() => {
    view.unmount();
  });
  const untilFrame = async (pattern: RegExp): Promise<void> => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (pattern.test(view.lastFrame() ?? "")) return;
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
    assert.match(view.lastFrame() ?? "", pattern);
  };
  // Under load, Enter can land before the target control mounts and get lost entirely, so
  // retry the keypress until the frame shows the expected step.
  const frameMatches = (pattern: RegExp): boolean => pattern.test(view.lastFrame() ?? "");
  const waitFor = async (pattern: RegExp, attempts: number): Promise<boolean> => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (frameMatches(pattern)) return true;
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
    return frameMatches(pattern);
  };
  const enterUntil = async (pattern: RegExp): Promise<void> => {
    for (let attempt = 0; attempt < 20 && !frameMatches(pattern); attempt += 1) {
      view.stdin.write("\r");
      if (await waitFor(pattern, 10)) return;
    }
    assert.match(view.lastFrame() ?? "", pattern);
  };
  // Accept the default engine; discovery resolves and the select appears at the model step.
  view.stdin.write("\r");
  await untilFrame(/Model identifier/);
  await untilFrame(/Discovered opencode models/);
  await enterUntil(/Provider/); // select the highlighted entry
  assert.match(view.lastFrame() ?? "", /› openai/); // provider derived from the identity
  await enterUntil(/Save model/); // accept the derived provider
  for (let attempt = 0; attempt < 200 && submitted.length === 0; attempt += 1) {
    if (attempt % 5 === 0) view.stdin.write("\r");
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0]?.model, "opencode/openai/gpt-5");
});

test("discovery failure keeps the manual identifier entry working", async (t) => {
  const view = render(
    <Box width={100} height={40}>
      <ModelForm
        terminalWidth={100}
        minimal
        onDiscoverModels={() => Promise.reject(new Error("catalog unavailable"))}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />
    </Box>,
  );
  t.after(() => {
    view.unmount();
  });
  const untilFrame = async (pattern: RegExp): Promise<void> => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (pattern.test(view.lastFrame() ?? "")) return;
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
    assert.match(view.lastFrame() ?? "", pattern);
  };
  view.stdin.write("\r");
  await untilFrame(/Discovery unavailable \(catalog unavailable\)/);
  assert.match(view.lastFrame() ?? "", /›/); // text input remains usable
});
