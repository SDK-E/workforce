import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { useInput } from "ink";
import type { CompanyRecord } from "../storage/records.js";
import { applicationShortcut } from "./application-shortcuts.js";
import { processPaletteInput } from "./command-palette-input.js";
import { matchesKeybinding } from "./keybindings.js";
import { moveGroup, NAVIGATION_SECTIONS } from "./navigation.js";
import type { useFormController } from "./use-form-controller.js";
import type { useLifecycleController } from "./use-lifecycle-controller.js";
import { handleContentInput, handleSidebarInput } from "./workforce-input.js";
import type { WorkspaceData } from "./workspace-data.js";

export interface WorkforceInputOptions {
  blocked: boolean;
  helpVisible: boolean;
  paletteVisible: boolean;
  paletteIndex: number;
  searchQuery: string;
  sidebarVisible: boolean;
  focus: "sidebar" | "content";
  selectedSection: string;
  lifecycle: ReturnType<typeof useLifecycleController>;
  forms: ReturnType<typeof useFormController>;
  data: WorkspaceData;
  company: CompanyRecord;
  onVerifyMcp: (companyId: string, serverId: string) => Promise<void>;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setPaletteVisible: Dispatch<SetStateAction<boolean>>;
  setPaletteIndex: Dispatch<SetStateAction<number>>;
  setSidebarVisible: Dispatch<SetStateAction<boolean>>;
  setFocus: Dispatch<SetStateAction<"sidebar" | "content">>;
  setHelpVisible: Dispatch<SetStateAction<boolean>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  setEmergencyVisible: Dispatch<SetStateAction<boolean>>;
  setExecutionTaskId: Dispatch<SetStateAction<string | null>>;
  setCompany: Dispatch<SetStateAction<CompanyRecord>>;
  cycleTheme: () => void;
}

export function useWorkforceInput(latestOptions: WorkforceInputOptions): void {
  const optionsRef = useRef(latestOptions);
  optionsRef.current = latestOptions;
  const handleInput = useCallback<Parameters<typeof useInput>[0]>((input, key) => {
    const options = optionsRef.current;
    if (options.blocked) return;
    if (options.helpVisible) {
      if (matchesKeybinding("help", input, key) || matchesKeybinding("cancel", input, key))
        options.setHelpVisible(false);
      return;
    }
    if (options.paletteVisible) {
      processPaletteInput(input, key, options.searchQuery, options.paletteIndex, {
        close: () => {
          options.setPaletteVisible(false);
          options.setSearchQuery("");
          options.setPaletteIndex(0);
        },
        select: (index) => {
          options.setSelectedIndex(index);
          options.setFocus("content");
        },
        status: options.setStatusMessage,
        query: options.setSearchQuery,
        selection: options.setPaletteIndex,
      });
      return;
    }
    if (handleShortcut(input, key, options)) return;
    if (matchesKeybinding("quit", input, key)) process.exit(0);
    if (matchesKeybinding("emergencyStop", input, key)) options.setEmergencyVisible(true);
    if (matchesKeybinding("help", input, key)) options.setHelpVisible(true);
    else if (matchesKeybinding("commandPalette", input, key)) {
      options.setPaletteIndex(0);
      options.setPaletteVisible(true);
    } else if (matchesKeybinding("areaNext", input, key))
      options.setSelectedIndex((current) => moveGroup(current, 1));
    else if (matchesKeybinding("areaPrevious", input, key))
      options.setSelectedIndex((current) => moveGroup(current, -1));
    else if (isFocusChange(input, key) && options.sidebarVisible)
      options.setFocus((current) => (current === "sidebar" ? "content" : "sidebar"));
    else if (
      matchesKeybinding("cancel", input, key) &&
      options.focus === "content" &&
      options.sidebarVisible
    )
      options.setFocus("sidebar");
    else if (options.focus === "sidebar")
      handleSidebarInput(input, key, options.setSelectedIndex, () => {
        options.setFocus("content");
      });
    else handleContentInput(input, key, { ...options, section: options.selectedSection });
  }, []);
  useInput(handleInput);
}

function handleShortcut(
  input: string,
  key: Parameters<typeof applicationShortcut>[1],
  options: WorkforceInputOptions,
): boolean {
  const shortcut = applicationShortcut(input, key);
  if (shortcut === "toggle-sidebar") {
    options.setSidebarVisible((visible) => !visible);
    options.setFocus("content");
  } else if (shortcut === "open-settings") {
    options.setSelectedIndex(NAVIGATION_SECTIONS.indexOf("Settings"));
    options.setFocus("content");
  } else if (shortcut === "open-palette") {
    options.setPaletteIndex(0);
    options.setPaletteVisible(true);
  }
  return shortcut !== null;
}

function isFocusChange(input: string, key: Parameters<typeof matchesKeybinding>[2]): boolean {
  return (
    matchesKeybinding("focusNext", input, key) || matchesKeybinding("focusPrevious", input, key)
  );
}
