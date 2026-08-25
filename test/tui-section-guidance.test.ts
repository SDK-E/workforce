import assert from "node:assert/strict";
import test from "node:test";
import { contentGuidance } from "../src/tui/section-guidance.js";

test("bottom-bar guidance exposes only actions implemented by the current section", () => {
  const tasks = contentGuidance("Tasks", true);
  assert.match(tasks, /N new/);
  assert.match(tasks, /E edit\/decide/);
  assert.match(tasks, /R run/);
  const diagnostics = contentGuidance("Advanced diagnostics", true);
  assert.doesNotMatch(diagnostics, /select|new|edit|archive|verify|run/);
  assert.match(diagnostics, /read-only diagnostics/);
  assert.match(diagnostics, /Tab sidebar/);
  assert.match(diagnostics, /\? all keys/);
  const settings = contentGuidance("Settings", false);
  assert.match(settings, /T next theme/);
  assert.match(settings, /Ctrl\+B show sidebar/);
  assert.match(contentGuidance("Live work", true), /read-only live evidence/);
  assert.match(contentGuidance("Deliverables", true), /read-only validated artifacts/);
  assert.match(contentGuidance("Audit", true), /read-only audit ledger/);
  assert.match(contentGuidance("Executive overview", true), /←\/→ switch panel/);
});
