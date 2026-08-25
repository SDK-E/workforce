export const KEYBINDINGS = {
  quit: ["q"],
  emergencyStop: ["!"],
  help: ["?"],
  commandPalette: ["/", "p", "ctrl+p", "ctrl+shift+p"],
  toggleSidebar: ["ctrl+b"],
  openSettings: ["ctrl+,"],
  focusNext: ["tab"],
  focusPrevious: ["shift+tab"],
  areaNext: ["ctrl+tab"],
  areaPrevious: ["ctrl+shift+tab"],
  cancel: ["escape"],
  activate: ["enter"],
  previous: ["up"],
  next: ["down"],
  previousVim: ["k"],
  nextVim: ["j"],
  previousPanel: ["left"],
  nextPanel: ["right"],
  create: ["n"],
  edit: ["e"],
  archive: ["d"],
  restore: ["u"],
  run: ["r"],
  verify: ["v"],
  nextTheme: ["t"],
  previousRecord: ["["],
  nextRecord: ["]"],
  confirm: ["y"],
} as const;

export type KeybindingCommand = keyof typeof KEYBINDINGS;
export interface InputKey {
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  tab?: boolean;
  escape?: boolean;
  return?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
}

export function matchesKeybinding(
  command: KeybindingCommand,
  input: string,
  key: InputKey,
): boolean {
  const chord = inputChord(input, key);
  return KEYBINDINGS[command].some((binding) => binding === chord);
}

export function bindingsFor(command: KeybindingCommand): string {
  return KEYBINDINGS[command].map(formatChord).join(" / ");
}

function formatChord(chord: string): string {
  const names: Record<string, string> = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
    enter: "Enter",
    escape: "Esc",
    tab: "Tab",
    ctrl: "Ctrl",
    shift: "Shift",
    meta: "Meta",
  };
  return chord
    .split("+")
    .map((part) => names[part] ?? (part.length === 1 ? part.toUpperCase() : part))
    .join("+");
}

export function duplicateKeybindings(): { chord: string; commands: KeybindingCommand[] }[] {
  const owners = new Map<string, KeybindingCommand[]>();
  for (const [command, bindings] of Object.entries(KEYBINDINGS) as [
    KeybindingCommand,
    readonly string[],
  ][])
    for (const binding of bindings) owners.set(binding, [...(owners.get(binding) ?? []), command]);
  return [...owners.entries()]
    .filter(([, commands]) => commands.length > 1)
    .map(([chord, commands]) => ({ chord, commands }));
}

function inputChord(input: string, key: InputKey): string {
  const special = specialKey(key);
  const base = special ?? input.toLowerCase();
  const modifiers = [
    key.ctrl && "ctrl",
    key.meta && special !== "escape" && "meta",
    key.shift && (key.ctrl === true || key.meta === true || special === "tab") && "shift",
  ].filter(Boolean);
  return [...modifiers, base].join("+");
}

function specialKey(key: InputKey): string | null {
  if (key.tab) return "tab";
  if (key.escape) return "escape";
  if (key.return) return "enter";
  if (key.upArrow) return "up";
  if (key.downArrow) return "down";
  if (key.leftArrow) return "left";
  if (key.rightArrow) return "right";
  return null;
}
