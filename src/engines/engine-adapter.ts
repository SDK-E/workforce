import type { SandboxSpec } from "../domain.js";

interface EngineLaunch {
  engine: SandboxSpec["engine"];
  model: string;
  objective: string;
}

export interface EngineAdapter {
  readonly name: SandboxSpec["engine"];
  readonly executable: string;
  verificationCommand(): string[];
  executionCommand(launch: EngineLaunch): string[];
  parseVersion(output: string): string;
}

abstract class OpenCodeFamilyAdapter implements EngineAdapter {
  abstract readonly name: SandboxSpec["engine"];
  abstract readonly executable: string;

  verificationCommand(): string[] {
    return [this.executable, "--version"];
  }

  executionCommand(launch: EngineLaunch): string[] {
    if (launch.engine !== this.name) throw new Error(`Engine adapter mismatch: ${launch.engine}`);
    if (!isValidModelIdentity(launch.model))
      throw new Error("Model identity must use provider/model format");
    if (!launch.objective.trim()) throw new Error("Engine objective is required");
    return [this.executable, "run", "--model", launch.model, launch.objective];
  }

  parseVersion(output: string): string {
    const version = /^\d+\.\d+\.\d+$/.exec(output.trim())?.[0];
    if (!version) throw new Error(`Invalid ${this.name} startup identity`);
    return version;
  }
}

const MODEL_IDENTITY_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:/-]+$/;

/** Single source of truth for runnable provider/model identities across adapters and catalogs. */
export function isValidModelIdentity(model: string): boolean {
  return MODEL_IDENTITY_PATTERN.test(model);
}

class KiloAdapter extends OpenCodeFamilyAdapter {
  readonly name = "kilo" as const;
  readonly executable = "kilo";
}

class OpenCodeAdapter extends OpenCodeFamilyAdapter {
  readonly name = "opencode" as const;
  readonly executable = "opencode";
}

export function engineAdapter(engine: SandboxSpec["engine"]): EngineAdapter {
  return engine === "kilo" ? new KiloAdapter() : new OpenCodeAdapter();
}
