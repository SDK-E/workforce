import { useState } from "react";
import type { CreateFormKind } from "./overlays/create-overlay.js";
import { createFormForSection, editFormForSection } from "./overlays/form-routing.js";

export function useFormController(onStatus: (message: string) => void) {
  const [active, setActive] = useState<CreateFormKind | null>(null);
  const [editing, setEditing] = useState(false);
  return {
    active,
    editing,
    openCreate(section: string) {
      setEditing(false);
      setActive(createFormForSection(section));
    },
    openEdit(section: string, hasSelection: boolean) {
      const kind = editFormForSection(section);
      if (requiresSelection(kind) && !hasSelection) {
        onStatus(`No record is selected to edit in ${section}`);
        return;
      }
      setEditing(true);
      setActive(kind);
    },
    close() {
      setEditing(false);
      setActive(null);
    },
  };
}

function requiresSelection(kind: CreateFormKind | null): boolean {
  return [
    "company-edit",
    "agent-profile",
    "organization",
    "strategy",
    "task",
    "mcp-server",
    "project-integration",
    "room",
    "meeting",
    "model",
    "approval-decision",
    "automation-decision",
    "hiring-decision",
    "incident-decision",
    "tool",
    "environment",
    "opportunity",
    "lead",
    "client",
    "engagement",
  ].includes(kind ?? "");
}
