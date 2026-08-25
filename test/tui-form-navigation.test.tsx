import assert from "node:assert/strict";
import { Box } from "ink";
import { render } from "ink-testing-library";
import test from "node:test";
import type { CreateCompanyInput } from "../src/storage/records.js";
import { CompanyCreateForm } from "../src/tui/overlays/company-create-form.js";

const noop = (): undefined => undefined;

test("form fields support going back with arrows and skipping forward", async () => {
  let submitted: CreateCompanyInput | undefined;
  const view = render(
    <Box width={100} height={24}>
      <CompanyCreateForm
        terminalWidth={100}
        onCancel={noop}
        onSubmit={(input) => {
          submitted = input;
        }}
      />
    </Box>,
  );
  await send(view, "Acme");
  await send(view, "\r");
  assert.match(frameOf(view), /Mission/);

  // Back returns to the name field with the earlier answer intact.
  await send(view, "\x1B[A");
  assert.match(frameOf(view), /Company name/);
  assert.match(frameOf(view), /Acme/);

  // Forward arrow skips ahead without pressing Enter.
  await send(view, "\x1B[B");
  assert.match(frameOf(view), /Mission/);

  await send(view, "Ship reliably");
  await send(view, "\r");
  assert.match(frameOf(view), /Create Acme/);
  await send(view, "\r");
  assert.ok(submitted);
  assert.equal(submitted.name, "Acme");
  assert.equal(submitted.mission, "Ship reliably");
  view.unmount();
});

test("empty required fields explain themselves instead of silently ignoring Enter", async () => {
  const view = render(
    <Box width={100} height={24}>
      <CompanyCreateForm terminalWidth={100} onCancel={noop} onSubmit={noop} />
    </Box>,
  );
  await send(view, "\r");
  assert.match(frameOf(view), /Company name is required/);
  view.unmount();
});

async function send(view: ReturnType<typeof render>, value: string): Promise<void> {
  view.stdin.write(value);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 60);
  });
}

function frameOf(view: ReturnType<typeof render>): string {
  return view.lastFrame() ?? "";
}
