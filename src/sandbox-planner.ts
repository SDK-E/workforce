import type { JobRequirements, SandboxSpec } from "./domain.js";

const IMAGE_BY_PROFILE = {
  document: "workforce-agent-document:0.1.0",
  research: "workforce-agent-browser:0.1.0",
  engineering: "workforce-agent-builder:0.1.0",
  browser: "workforce-agent-browser:0.1.0",
  "restricted-review": "workforce-agent-reviewer:0.1.0",
} as const;

export function planSandbox(job: JobRequirements): SandboxSpec {
  const { capabilities: c } = job;
  const decisions: string[] = [];
  const rejectedCapabilities: string[] = [];

  let profile: keyof typeof IMAGE_BY_PROFILE = "document";
  if (job.dataSensitivity === "restricted" || job.risk === "critical")
    profile = "restricted-review";
  else if (c.shell || c.sourceControl || c.packageInstall || c.buildTools.length)
    profile = "engineering";
  else if (c.browser) profile = "browser";
  else if (c.publicInternet) profile = "research";

  if (job.dataSensitivity === "restricted" && c.publicInternet) {
    rejectedCapabilities.push("publicInternet");
    decisions.push(
      "Restricted data forbids public networking; the job must be split or explicitly re-authorized.",
    );
  }
  if (job.risk === "critical" && (c.shell || c.packageInstall)) {
    rejectedCapabilities.push("shell", "packageInstall");
    decisions.push(
      "Critical-risk work is review-only until a human approves a lower-level execution task.",
    );
  }
  if (c.publicInternet && job.network.allowedHosts.length === 0) {
    rejectedCapabilities.push("publicInternet");
    decisions.push("Internet was requested without allowlisted hosts.");
  }

  const networkApproved =
    c.publicInternet &&
    job.network.allowedHosts.length > 0 &&
    job.dataSensitivity !== "restricted" &&
    job.risk !== "critical";
  const tools = ["read", "write-output", "workforce-chat", "workforce-checkpoint"];
  if (c.shell && !rejectedCapabilities.includes("shell")) tools.push("shell");
  if (c.sourceControl) tools.push("git");
  if (c.browser) tools.push("playwright");
  if (c.packageInstall && !rejectedCapabilities.includes("packageInstall"))
    tools.push("package-manager");
  tools.push(
    ...c.buildTools.map((tool) => `build:${tool}`),
    ...c.languages.map((language) => `language:${language}`),
  );

  decisions.push(
    `Selected ${profile} from explicit capability, risk, and sensitivity requirements.`,
  );
  decisions.push(
    networkApproved
      ? `Network restricted to ${job.network.allowedHosts.join(", ")}.`
      : "Network disabled.",
  );
  decisions.push(
    "Workspace uses a private Docker volume; host repositories are copied in as declared inputs.",
  );

  return {
    jobId: job.id,
    profile,
    image: IMAGE_BY_PROFILE[profile],
    engine: job.enginePreference[0]!,
    networkMode: networkApproved ? "allowlisted" : "none",
    allowedHosts: networkApproved ? job.network.allowedHosts : [],
    readOnlyRoot: true,
    nonRoot: true,
    capDropAll: true,
    noNewPrivileges: true,
    workspace: { type: "volume", name: `workforce-job-${job.id}` },
    inputs: job.inputs.map((input, index) => ({
      source: input.source,
      containerPath: `/work/input/${index}-${input.name.replace(/[^A-Za-z0-9._-]/g, "_")}`,
      readOnly: true,
    })),
    tmpfs: ["/tmp:rw,noexec,nosuid,size=256m", "/run:rw,noexec,nosuid,size=16m"],
    cpu: job.resources.cpu,
    memoryMb: job.resources.memoryMb,
    pids: job.resources.pids,
    timeoutSeconds: job.resources.timeoutSeconds,
    tools: [...new Set(tools)].sort(),
    decisions,
    rejectedCapabilities: [...new Set(rejectedCapabilities)],
  };
}
