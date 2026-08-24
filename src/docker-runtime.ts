import { spawn } from "node:child_process";
import type { SandboxSpec } from "./domain.js";

export interface DockerStatus {
  available: boolean;
  version?: string;
  reason?: string;
}

export async function dockerStatus(): Promise<DockerStatus> {
  return await new Promise((resolve) => {
    const child = spawn("docker", ["version", "--format", "{{.Server.Version}}"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", (error) => resolve({ available: false, reason: error.message }));
    child.once("close", (code) =>
      resolve(
        code === 0
          ? { available: true, version: stdout.trim() }
          : { available: false, reason: stderr.trim() || `docker exited ${code}` },
      ),
    );
  });
}

export function dockerRunArguments(
  spec: SandboxSpec,
  attemptId: string,
  command: string[],
): string[] {
  if (spec.rejectedCapabilities.length)
    throw new Error(
      `Sandbox plan has rejected capabilities: ${spec.rejectedCapabilities.join(", ")}`,
    );
  if (spec.networkMode === "allowlisted") {
    throw new Error(
      "Allowlisted networking requires the workforce egress proxy; direct Docker networking is intentionally refused.",
    );
  }
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
    "none",
    "--cpus",
    String(spec.cpu),
    "--memory",
    `${spec.memoryMb}m`,
    "--pids-limit",
    String(spec.pids),
    "--mount",
    `type=volume,src=${spec.workspace.name},dst=/work`,
  ];
  for (const tmpfs of spec.tmpfs) args.push("--tmpfs", tmpfs);
  args.push(spec.image, ...command);
  return args;
}
