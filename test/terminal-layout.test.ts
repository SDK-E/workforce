import assert from "node:assert/strict";
import test from "node:test";
import { terminalLayout } from "../src/tui/terminal-layout.js";

test("terminal layout adapts sidebar and panels at stable resize thresholds", () => {
  assert.deepEqual(terminalLayout(120, 40), {
    width: 120,
    height: 40,
    compact: false,
    sidebarAllowed: true,
  });
  assert.deepEqual(terminalLayout(80, 24), {
    width: 80,
    height: 24,
    compact: true,
    sidebarAllowed: true,
  });
  assert.deepEqual(terminalLayout(50, 18), {
    width: 50,
    height: 18,
    compact: true,
    sidebarAllowed: false,
  });
});

test("terminal layout remains usable when stdout is not a TTY", () => {
  assert.deepEqual(terminalLayout(undefined, 0), {
    width: 100,
    height: 30,
    compact: false,
    sidebarAllowed: true,
  });
});
