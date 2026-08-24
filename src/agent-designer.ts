import { randomUUID } from "node:crypto";
import type { Employee, JobRequirements, SandboxSpec } from "./domain.js";
import { planSandbox } from "./sandbox-planner.js";

export interface AgentBlueprint {
  employee: Employee;
  jobId: string;
  sandbox: SandboxSpec;
  enginePolicy: { preferred: string; fallbacks: string[] };
  instructions: string[];
  permissions: string[];
  skills: string[];
  probationCriteria: string[];
  rationale: string[];
}

function titleFor(job: JobRequirements, sandbox: SandboxSpec): string {
  const languages = job.capabilities.languages.map((item) => item.toLowerCase());
  if (sandbox.profile === "engineering") {
    if (languages.includes("typescript")) return "TypeScript Delivery Engineer";
    if (languages.includes("python")) return "Python Delivery Engineer";
    return "Software Delivery Engineer";
  }
  if (sandbox.profile === "browser") return "Browser Automation Specialist";
  if (sandbox.profile === "research") return "Evidence Research Specialist";
  if (sandbox.profile === "restricted-review") return "Restricted-Data Review Specialist";
  return "Documentation Specialist";
}

export function designAgentForJob(job: JobRequirements, manager = "arm"): AgentBlueprint {
  const sandbox = planSandbox(job);
  if (sandbox.rejectedCapabilities.length)
    throw new Error(
      `Job requirements need authorization or decomposition before hiring: ${sandbox.rejectedCapabilities.join(", ")}`,
    );
  const title = titleFor(job, sandbox);
  const suffix = randomUUID().slice(0, 8);
  const skills = [
    ...job.capabilities.languages.map((language) => `language:${language.toLowerCase()}`),
    ...job.capabilities.buildTools.map((tool) => `tool:${tool.toLowerCase()}`),
    job.capabilities.browser ? "browser-automation" : null,
    job.capabilities.publicInternet ? "evidence-research" : null,
    job.capabilities.sourceControl ? "source-control" : null,
    "acceptance-verification",
    "workforce-collaboration",
  ].filter((item): item is string => Boolean(item));
  const instructions = [
    `Objective: ${job.objective}`,
    `Operate only inside job ${job.id}'s container and private volume.`,
    `Use only these granted tools: ${sandbox.tools.join(", ")}.`,
    "Read task chat at startup and safe checkpoints; use chat for collaboration and durable handoffs for formal results.",
    "Do not claim completion from process success. Demonstrate each acceptance criterion with observable evidence.",
    `Required outputs: ${job.outputs
      .filter((output) => output.required)
      .map((output) => output.path)
      .join(", ")}.`,
    `Network policy: ${sandbox.networkMode === "inference-only" ? "audited model inference endpoints only" : `audited ${sandbox.networkMode}${sandbox.allowedHosts.length ? ` for ${sandbox.allowedHosts.join(", ")}` : ""}`}.`,
    "Stop and escalate rather than bypassing a denied capability or trust boundary.",
  ];
  const probationCriteria = [
    ...job.acceptanceCriteria.map((criterion) => `Satisfy and evidence: ${criterion}`),
    "Create every required output and pass its declared validator.",
    "Use no undeclared capability, path, host, credential, or tool.",
    "Leave an auditable handoff another agent can reproduce.",
  ];
  return {
    employee: {
      id: `${sandbox.profile}-${suffix}`,
      name: `${title} ${suffix}`,
      title,
      department:
        sandbox.profile === "engineering"
          ? "engineering"
          : sandbox.profile === "research"
            ? "research"
            : "operations",
      manager,
      status: "probation",
      responsibilities: [job.objective],
      capabilityTags: [...new Set(skills)].sort(),
      hiredAt: new Date().toISOString(),
    },
    jobId: job.id,
    sandbox,
    enginePolicy: { preferred: sandbox.engine, fallbacks: job.enginePreference.slice(1) },
    instructions,
    permissions: sandbox.tools,
    skills: [...new Set(skills)].sort(),
    probationCriteria,
    rationale: [
      `Created a probationary ${title} because the job requires profile ${sandbox.profile}.`,
      "Skills derive from declared languages, tools, browser, network, and source-control requirements.",
      "Permissions exactly match the sandbox tool plan; no employee template grants additional capability.",
      ...sandbox.decisions,
    ],
  };
}
