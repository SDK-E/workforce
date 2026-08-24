import { execa } from "execa";
import type { SandboxSpec } from "../domain.js";
import { dockerRunArguments, type EgressRuntimePolicy } from "../docker-runtime.js";
import type { AttemptResult } from "./attempt-types.js";

export interface DockerClient {
  available(): Promise<boolean>;
  createVolume(name: string): Promise<void>;
  start(
    spec: SandboxSpec,
    attemptId: string,
    command: string[],
    secretEnvironment?: Record<string, string>,
  ): Promise<AttemptResult>;
  stop(containerName: string): Promise<void>;
  managedContainers(): Promise<string[]>;
  removeContainer(containerName: string): Promise<void>;
}

export class ExecaDockerClient implements DockerClient {
  constructor(private readonly egress?: EgressRuntimePolicy) {}

  async available(): Promise<boolean> {
    const result = await execa("docker", ["info", "--format", "{{.ServerVersion}}"], {
      reject: false,
      timeout: 5_000,
    });
    return result.exitCode === 0;
  }

  async createVolume(name: string): Promise<void> {
    const result = await execa(
      "docker",
      ["volume", "create", "--label", "workforce.managed=true", name],
      { reject: false, timeout: 10_000 },
    );
    if (result.exitCode !== 0) throw new Error(`Docker volume creation failed: ${result.stderr}`);
  }

  async start(
    spec: SandboxSpec,
    attemptId: string,
    command: string[],
    secretEnvironment: Record<string, string> = {},
  ): Promise<AttemptResult> {
    const result = await execa(
      "docker",
      dockerRunArguments(spec, attemptId, command, this.egress, Object.keys(secretEnvironment)),
      {
        reject: false,
        timeout: spec.timeoutSeconds * 1_000,
        maxBuffer: 1_048_576,
        env: { ...process.env, ...secretEnvironment },
      },
    );
    return {
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout.slice(-524_288),
      stderr: result.stderr.slice(-524_288),
      timedOut: result.timedOut,
    };
  }

  async stop(containerName: string): Promise<void> {
    await execa("docker", ["stop", "--time", "10", containerName], {
      reject: false,
      timeout: 15_000,
    });
    await execa("docker", ["rm", "--force", containerName], { reject: false, timeout: 10_000 });
  }

  async managedContainers(): Promise<string[]> {
    const result = await execa(
      "docker",
      ["ps", "--all", "--filter", "label=workforce.managed=true", "--format", "{{.Names}}"],
      { reject: false, timeout: 5_000 },
    );
    if (result.exitCode !== 0) throw new Error(`Docker inventory failed: ${result.stderr}`);
    return result.stdout
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  async removeContainer(containerName: string): Promise<void> {
    await execa("docker", ["rm", "--force", containerName], { reject: false, timeout: 10_000 });
  }
}
