import { useState } from "react";
import { bindingsFor, matchesKeybinding, type InputKey } from "./keybindings.js";
export interface FormSteps {
  readonly step: number;
  readonly confirming: boolean;
  readonly error: string;
  fail(message: string): void;
  advance(): void;
  retreat(): void;
  goTo(index: number): void;
}

/**
 * Shared wizard state for overlay forms. Values live in each form so stepping back always shows
 * the previously entered answer for editing. `advance` never moves past the confirm step;
 * `retreat` never moves before the first field.
 */
export function useFormSteps(count: number): FormSteps {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  return {
    step,
    confirming: step >= count,
    error,
    fail: (message) => {
      setError(message);
    },
    advance: () => {
      setError("");
      setStep((current) => Math.min(count, current + 1));
    },
    retreat: () => {
      setError("");
      setStep((current) => Math.max(0, current - 1));
    },
    goTo: (index) => {
      setError("");
      setStep(Math.max(0, Math.min(count, index)));
    },
  };
}

/**
 * Field movement reuses the existing global arrow commands so every chord keeps one meaning:
 * ↑ (`previous`) backs out of a text field, ↓ (`next`) skips forward, and on select steps — where
 * ↑/↓ already move the highlighted option — ← (`previousPanel`) goes back to the previous field.
 */
export function isFieldBack(input: string, key: InputKey, selectStep: boolean): boolean {
  return matchesKeybinding(selectStep ? "previousPanel" : "previous", input, key);
}

export function isFieldForward(input: string, key: InputKey, selectStep: boolean): boolean {
  return !selectStep && matchesKeybinding("next", input, key);
}

/** Truthful per-state footer describing exactly which keys work on the current step. */
export function formFooter(
  confirming: boolean,
  step: number,
  count: number,
  options?: { selectStep?: boolean; verb?: string },
): string {
  const verb = options?.verb ?? "next";
  const cancel = `${bindingsFor("cancel")} cancel`;
  if (confirming) {
    return `${bindingsFor("activate")} save · ${bindingsFor("previous")} back · ${cancel}`;
  }
  const back = options?.selectStep
    ? `${bindingsFor("previousPanel")} back`
    : `${bindingsFor("previous")} back`;
  const parts = [`${bindingsFor("activate")} ${verb}`, back];
  if (!options?.selectStep) parts.push(`${bindingsFor("next")} skip`);
  parts.push(cancel, `${step + 1}/${count}`);
  return parts.join(" · ");
}

export function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
