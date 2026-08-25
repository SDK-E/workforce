import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import { ModelForm } from "../src/tui/overlays/model-form.js";

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
  assert.match(view.lastFrame() ?? "", /opencode-primary/);
  view.unmount();
});
