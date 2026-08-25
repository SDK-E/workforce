import { highContrast } from "./high-contrast.js";
import type { WorkforceTheme } from "./theme.js";
import { workforceDark } from "./workforce-dark.js";

export const THEMES: readonly WorkforceTheme[] = [workforceDark, highContrast];
export const DEFAULT_THEME = workforceDark;

export function themeById(id: string | undefined): WorkforceTheme {
  return THEMES.find((theme) => theme.id === id) ?? DEFAULT_THEME;
}

export function nextTheme(current: WorkforceTheme): WorkforceTheme {
  const index = THEMES.findIndex(({ id }) => id === current.id);
  return THEMES[(index + 1) % THEMES.length] ?? DEFAULT_THEME;
}
