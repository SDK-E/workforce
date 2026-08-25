import type { Dispatch, SetStateAction } from "react";
import { sanitizeTerminal } from "../storage/sanitize-terminal.js";
import { NAVIGATION_SECTIONS } from "./navigation.js";
import { matchesKeybinding } from "./keybindings.js";

export interface PaletteKey {
  escape: boolean;
  return: boolean;
  backspace: boolean;
  delete: boolean;
  ctrl: boolean;
  meta: boolean;
  upArrow: boolean;
  downArrow: boolean;
}

export function paletteMatches(query: string): string[] {
  return NAVIGATION_SECTIONS.filter((section) =>
    section.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 8);
}

export function processPaletteInput(
  input: string,
  key: PaletteKey,
  searchQuery: string,
  selectedIndex: number,
  actions: {
    close: () => void;
    select: (index: number) => void;
    status: (message: string) => void;
    query: Dispatch<SetStateAction<string>>;
    selection: Dispatch<SetStateAction<number>>;
  },
): void {
  const matches = paletteMatches(searchQuery);
  if (matchesKeybinding("previous", input, key)) {
    actions.selection((current) => wrap(current - 1, matches.length));
    return;
  }
  if (matchesKeybinding("next", input, key)) {
    actions.selection((current) => wrap(current + 1, matches.length));
    return;
  }
  if (matchesKeybinding("cancel", input, key)) {
    actions.close();
    return;
  }
  if (matchesKeybinding("activate", input, key)) {
    const selected = matches[selectedIndex];
    const match = selected ? NAVIGATION_SECTIONS.indexOf(selected) : -1;
    if (match >= 0) {
      actions.select(match);
      actions.status(`Opened ${NAVIGATION_SECTIONS[match]}`);
    }
    actions.close();
  } else if (key.backspace || key.delete) {
    actions.query((current) => current.slice(0, -1));
    actions.selection(0);
  } else if (input && !key.ctrl && !key.meta) {
    actions.query((current) => sanitizeTerminal(current + input, 60));
    actions.selection(0);
  }
}

function wrap(index: number, length: number): number {
  return length === 0 ? 0 : (index + length) % length;
}
