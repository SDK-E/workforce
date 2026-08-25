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
import { duplicateKeybindings, KEYBINDINGS, matchesKeybinding } from "../src/tui/keybindings.js";
import { handleSidebarInput } from "../src/tui/workforce-input.js";
import { THEMES, themeById } from "../src/tui/themes/index.js";

test("navigation exposes focused areas and keeps page movement inside the active area", () => {
  assert.equal(NAVIGATION_GROUPS.length, 8);
  assert.equal(new Set(NAVIGATION_SECTIONS).size, NAVIGATION_SECTIONS.length);
  assert.equal(navigationGroup("Tasks").label, "Strategy & work");
  const tasks = NAVIGATION_SECTIONS.indexOf("Tasks");
  const nextPage = NAVIGATION_SECTIONS[moveWithinGroup(tasks, 1)];
  assert.equal(nextPage, "Live work");
  assert.equal(navigationGroup(nextPage).label, "Strategy & work");
  assert.equal(NAVIGATION_SECTIONS[moveGroup(tasks, 1)], "Opportunities");
  assert.equal(NAVIGATION_SECTIONS[moveGroup(0, -1)], "Settings");
});

test("VS Code-style application shortcuts remain modifier scoped", () => {
  assert.equal(applicationShortcut("p", { ctrl: true }), "open-palette");
  assert.equal(applicationShortcut("b", { ctrl: true }), "toggle-sidebar");
  assert.equal(applicationShortcut(",", { ctrl: true }), "open-settings");
  assert.equal(applicationShortcut("p", { ctrl: false }), null);
});

test("configured keybindings are unique and arrow navigation changes the focused sidebar", () => {
  assert.deepEqual(duplicateKeybindings(), []);
  assert.ok(Object.keys(KEYBINDINGS).length > 20);
  assert.equal(matchesKeybinding("previous", "", { upArrow: true }), true);
  assert.equal(matchesKeybinding("next", "", { downArrow: true }), true);
  let selected = 0;
  let contentFocused = false;
  const select = (update: (current: number) => number) => {
    selected = update(selected);
  };
  handleSidebarInput(
    "",
    { upArrow: false, downArrow: true, rightArrow: false, return: false },
    select,
    () => {
      contentFocused = true;
    },
  );
  assert.equal(NAVIGATION_SECTIONS[selected], "CEO office");
  handleSidebarInput(
    "",
    { upArrow: false, downArrow: false, rightArrow: false, return: true },
    select,
    () => {
      contentFocused = true;
    },
  );
  assert.equal(contentFocused, true);
});

test("theme registry exposes unique configurable themes with a stable fallback", () => {
  assert.ok(THEMES.length >= 2);
  assert.equal(new Set(THEMES.map(({ id }) => id)).size, THEMES.length);
  assert.equal(themeById("missing").id, "workforce-dark");
});
