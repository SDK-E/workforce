import { useEffect, useState } from "react";
import type { StateStore } from "../storage/state-store.js";
import { matchesKeybinding } from "./keybindings.js";
import {
  applyLifecycleAction,
  lifecycleTargets,
  lifecycleVerb,
  type LifecycleData,
  type LifecycleTarget,
} from "./lifecycle-actions.js";

export function useLifecycleController(input: {
  section: string;
  companyId: string;
  data: LifecycleData;
  store: StateStore;
  onStatus: (message: string) => void;
}) {
  const [rowIndex, setRowIndex] = useState(0);
  const [target, setTarget] = useState<LifecycleTarget | null>(null);
  const targets = lifecycleTargets(input.section, input.data);
  useEffect(() => {
    setRowIndex(0);
  }, [input.section, input.companyId]);

  function handleKey(key: string): boolean {
    if (matchesKeybinding("previousRecord", key, {}))
      setRowIndex((current) => moveRow(current, -1, targets.length));
    else if (matchesKeybinding("nextRecord", key, {}))
      setRowIndex((current) => moveRow(current, 1, targets.length));
    else if (matchesKeybinding("archive", key, {})) request("archive");
    else if (matchesKeybinding("restore", key, {})) request("restore");
    else return false;
    return true;
  }

  function request(action: "archive" | "restore"): void {
    const selected = targets[rowIndex];
    if (!selected) input.onStatus(`No manageable record is selected in ${input.section}`);
    else if (selected.lifecycleMutable === false)
      input.onStatus(
        selected.lifecycleNote ??
          `${selected.label} uses its governed decision workflow; press Edit`,
      );
    else if (action === "archive" && lifecycleVerb(selected) === "restore")
      input.onStatus(`${selected.label} is already archived; use Restore instead`);
    else if (action === "restore" && lifecycleVerb(selected) === "archive")
      input.onStatus(`${selected.label} is not archived`);
    else setTarget(selected);
  }

  function confirm(): void {
    const selected = target;
    setTarget(null);
    if (!selected) return;
    try {
      const verb = lifecycleVerb(selected);
      applyLifecycleAction(input.store, input.companyId, selected);
      input.onStatus(
        `${selected.label} ${verb === "archive" ? "archived" : "restored"} and audited`,
      );
    } catch (error) {
      input.onStatus(error instanceof Error ? error.message : "Lifecycle action failed");
    }
  }

  return {
    rowIndex,
    selected: targets[rowIndex] ?? null,
    target,
    handleKey,
    moveSelection: (offset: number) => {
      setRowIndex((current) => moveRow(current, offset, targets.length));
    },
    confirm,
    cancel: () => {
      setTarget(null);
    },
  };
}

function moveRow(current: number, offset: number, length: number): number {
  return length === 0 ? 0 : (current + offset + length) % length;
}
