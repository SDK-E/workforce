export interface ShortcutKey {
  ctrl: boolean;
}

export type ApplicationShortcut = "toggle-sidebar" | "open-settings" | "open-palette";

export function applicationShortcut(input: string, key: ShortcutKey): ApplicationShortcut | null {
  if (!key.ctrl) return null;
  if (input === "b") return "toggle-sidebar";
  if (input === ",") return "open-settings";
  if (input === "p") return "open-palette";
  return null;
}
