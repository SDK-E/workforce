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
  assert.match(diagnostics, /Tab sidebar/);
  assert.match(diagnostics, /\? all keys/);
  const settings = contentGuidance("Settings", false);
  assert.match(settings, /T next theme/);
  assert.match(settings, /Ctrl\+B show sidebar/);
});
