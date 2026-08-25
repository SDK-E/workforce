import { JobRequirementsSchema, type JobRequirements } from "../domain.js";
import type { TaskRecord } from "./task-types.js";

export function taskJobRequirements(task: TaskRecord): JobRequirements {
  const capability = new Set([...task.capabilities, ...task.tools]);
  const mode = networkMode(task.networkPolicy.mode);
  return JobRequirementsSchema.parse({
    id: `job-${task.id}`,
    title: task.objective.slice(0, 200),
    objective: task.objective,
    risk: task.risk,
    dataSensitivity: task.dataSensitivity,
    capabilities: {
      filesystemWrite: true,
      shell: capability.has("shell") || capability.has("engineering"),
      sourceControl: capability.has("git") || capability.has("github-cli"),
      browser: capability.has("browser"),
      publicInternet: mode !== "inference-only",
      packageInstall: capability.has("package-manager") || capability.has("engineering"),
      buildTools: task.tools.filter((tool) => tool.startsWith("build:")).map(afterColon),
      languages: task.capabilities.filter((item) => item.startsWith("language:")).map(afterColon),
    },
    inputs: task.inputs,
    outputs: task.outputs,
    network: {
      mode,
      allowedHosts: strings(task.networkPolicy.allowedHosts),
      reason: string(task.networkPolicy.reason, "Remote model inference"),
      approvedBy: optionalString(task.networkPolicy.approvedBy),
    },
    resources: {
      cpu: number(task.resourcePolicy.cpu, 1),
      memoryMb: number(task.resourcePolicy.memoryMb, 768),
      pids: number(task.resourcePolicy.pids, 128),
      timeoutSeconds: number(task.resourcePolicy.timeoutSeconds, 1800),
    },
    enginePreference: task.modelPolicy.enginePreference,
    acceptanceCriteria: task.acceptanceCriteria,
  });
}

function networkMode(value: unknown) {
  return value === "search-only" || value === "allowlisted" || value === "audited-internet"
    ? value
    : "inference-only";
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function string(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function afterColon(value: string): string {
  return value.slice(value.indexOf(":") + 1);
}
