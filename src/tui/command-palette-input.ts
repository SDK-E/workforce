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
}

export function processPaletteInput(
  input: string,
  key: PaletteKey,
  searchQuery: string,
  actions: {
    close: () => void;
    select: (index: number) => void;
    status: (message: string) => void;
    query: Dispatch<SetStateAction<string>>;
  },
): void {
  if (matchesKeybinding("cancel", input, key)) {
    actions.close();
    return;
  }
  if (matchesKeybinding("activate", input, key)) {
    const match = NAVIGATION_SECTIONS.findIndex((section) =>
      section.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    if (match >= 0) {
      actions.select(match);
      actions.status(`Opened ${NAVIGATION_SECTIONS[match]}`);
    }
    actions.close();
  } else if (key.backspace || key.delete) {
    actions.query((current) => current.slice(0, -1));
  } else if (input && !key.ctrl && !key.meta) {
    actions.query((current) => sanitizeTerminal(current + input, 60));
  }
}
