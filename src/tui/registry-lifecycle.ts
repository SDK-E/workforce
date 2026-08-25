import type { LifecycleData, LifecycleTarget } from "./lifecycle-actions.js";

const REGISTRY_NOTE = "Registry entries stay available; manage them through Edit and verification";

export function registryLifecycleTargets(
  section: string,
  data: LifecycleData,
): LifecycleTarget[] | null {
  if (section === "Models & engines")
    return data.models.map((item) => ({
      kind: "model",
      id: item.id,
      label: `${item.engine} · ${item.model}`,
      status: item.health,
      lifecycleMutable: false,
      lifecycleNote:
        "Model registry entries are retained for execution history; edit or verify instead",
    }));
  if (section === "Tools")
    return data.tools.map((item) => ({
      kind: "tool",
      id: item.id,
      label: `${item.id} · ${item.provider}`,
      status: item.health,
      lifecycleMutable: false,
      lifecycleNote: REGISTRY_NOTE,
    }));
  if (section === "Environments")
    return data.environments.map((item) => ({
      kind: "environment",
      id: item.id,
      label: `${item.name} · ${item.sandboxImage}`,
      status: item.health,
      lifecycleMutable: false,
      lifecycleNote: REGISTRY_NOTE,
    }));
  return null;
}
