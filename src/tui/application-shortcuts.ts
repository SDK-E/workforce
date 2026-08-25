import { matchesKeybinding } from "./keybindings.js";

export interface ShortcutKey {
  ctrl: boolean;
  shift?: boolean;
}

export type ApplicationShortcut = "toggle-sidebar" | "open-settings" | "open-palette";

export function applicationShortcut(input: string, key: ShortcutKey): ApplicationShortcut | null {
  if (matchesKeybinding("toggleSidebar", input, key)) return "toggle-sidebar";
  if (matchesKeybinding("openSettings", input, key)) return "open-settings";
  if (matchesKeybinding("commandPalette", input, key) && key.ctrl) return "open-palette";
  return null;
}
