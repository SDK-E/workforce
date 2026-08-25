import assert from "node:assert/strict";
import test from "node:test";
import {
  moveGroup,
  moveWithinGroup,
  NAVIGATION_GROUPS,
  NAVIGATION_SECTIONS,
  navigationGroup,
} from "../src/tui/navigation.js";
import { applicationShortcut } from "../src/tui/application-shortcuts.js";

test("navigation exposes focused areas and keeps page movement inside the active area", () => {
  assert.equal(NAVIGATION_GROUPS.length, 7);
  assert.equal(new Set(NAVIGATION_SECTIONS).size, NAVIGATION_SECTIONS.length);
  assert.equal(navigationGroup("Tasks").label, "Strategy & work");
  const tasks = NAVIGATION_SECTIONS.indexOf("Tasks");
  const nextPage = NAVIGATION_SECTIONS[moveWithinGroup(tasks, 1)];
  assert.equal(nextPage, "Live work");
  assert.equal(navigationGroup(nextPage).label, "Strategy & work");
  assert.equal(NAVIGATION_SECTIONS[moveGroup(tasks, 1)], "Meetings");
  assert.equal(NAVIGATION_SECTIONS[moveGroup(0, -1)], "Settings");
});

test("VS Code-style application shortcuts remain modifier scoped", () => {
  assert.equal(applicationShortcut("p", { ctrl: true }), "open-palette");
  assert.equal(applicationShortcut("b", { ctrl: true }), "toggle-sidebar");
  assert.equal(applicationShortcut(",", { ctrl: true }), "open-settings");
  assert.equal(applicationShortcut("p", { ctrl: false }), null);
});
