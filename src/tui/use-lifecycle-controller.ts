import { useEffect, useState } from "react";
import type { StateStore } from "../storage/state-store.js";
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
    if (key === "[") setRowIndex((current) => moveRow(current, -1, targets.length));
    else if (key === "]") setRowIndex((current) => moveRow(current, 1, targets.length));
    else if (key === "d" || key === "u") request(key);
    else return false;
    return true;
  }

  function request(key: "d" | "u"): void {
    const selected = targets[rowIndex];
    if (!selected) input.onStatus(`No manageable record is selected in ${input.section}`);
    else if (key === "d" && lifecycleVerb(selected) === "restore")
      input.onStatus(`${selected.label} is already archived; press u to restore it`);
    else if (key === "u" && lifecycleVerb(selected) === "archive")
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
    target,
    handleKey,
    confirm,
    cancel: () => {
      setTarget(null);
    },
  };
}

function moveRow(current: number, offset: number, length: number): number {
  return length === 0 ? 0 : (current + offset + length) % length;
}
