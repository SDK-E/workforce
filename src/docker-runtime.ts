import { execa } from "execa";
import type { SandboxSpec } from "./domain.js";

export interface DockerStatus {
  available: boolean;
  version?: string;
  reason?: string;
}

export interface EgressRuntimePolicy {
  networkName: string;
  proxyUrl: string;
}

export async function dockerStatus(): Promise<DockerStatus> {
  const result = await execa("docker", ["version", "--format", "{{.Server.Version}}"], {
    reject: false,
    timeout: 5_000,
  });
  if (result.exitCode === 0) {
    return { available: true, version: result.stdout.trim() };
  }
  const stderr = result.stderr.trim();
  return {
    available: false,
    reason: stderr.length > 0 ? stderr : (result.shortMessage ?? "Docker is unavailable"),
  };
}

export async function dockerImageExists(image: string): Promise<boolean> {
  const result = await execa("docker", ["image", "inspect", image], {
    reject: false,
    timeout: 5_000,
  });
  return result.exitCode === 0;
}

export function dockerRunArguments(
  spec: SandboxSpec,
  attemptId: string,
  command: string[],
  egress?: EgressRuntimePolicy,
): string[] {
  if (spec.rejectedCapabilities.length)
    throw new Error(
      `Sandbox plan has rejected capabilities: ${spec.rejectedCapabilities.join(", ")}`,
    );
  if (spec.networkMode !== "none" && !egress) {
    throw new Error(
      "Networked execution requires the workforce egress proxy; direct Docker networking is intentionally refused.",
    );
  }
  const dockerNetwork = spec.networkMode === "none" ? "none" : egress?.networkName;
  if (!dockerNetwork) throw new Error("An internal egress network is required");
  const args = [
    "run",
    "--rm",
    "--name",
    `workforce-${attemptId}`,
    "--label",
    "workforce.managed=true",
    "--label",
    `workforce.job=${spec.jobId}`,
    "--read-only",
    "--user",
    "10001:10001",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges:true",
    "--network",
    dockerNetwork,
    "--cpus",
    String(spec.cpu),
    "--memory",
    `${spec.memoryMb}m`,
    "--pids-limit",
    String(spec.pids),
    "--mount",
    `type=volume,src=${spec.workspace.name},dst=/work`,
  ];
  if (egress) {
    args.push("--env", `HTTP_PROXY=${egress.proxyUrl}`);
    args.push("--env", `HTTPS_PROXY=${egress.proxyUrl}`);
    args.push("--env", "NO_PROXY=");
    args.push("--label", `workforce.network-policy=${spec.networkMode}`);
  }
  for (const tmpfs of spec.tmpfs) args.push("--tmpfs", tmpfs);
  args.push(spec.image, ...command);
  return args;
}
