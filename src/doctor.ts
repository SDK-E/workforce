import { dockerImageExists, dockerStatus } from "./docker-runtime.js";

const docker = await dockerStatus();
const images = docker.available
  ? await Promise.all([
      dockerImageExists("workforce-agent-base:0.1.0"),
      dockerImageExists("workforce-agent-builder:0.1.0"),
      dockerImageExists("workforce-agent-reviewer:0.1.0"),
    ])
  : [false, false, false];
const imagesReady = images.every(Boolean);
console.log("Workforce doctor");
console.log(`Docker: ${docker.available ? `available (${docker.version})` : "BLOCKED"}`);
if (!docker.available) console.log(`Reason: ${docker.reason}`);
console.log(`Agent images: ${imagesReady ? "available" : "missing — run pnpm images:build"}`);
console.log("Host agent execution: disabled by policy");
console.log(
  `Execution readiness: ${docker.available && imagesReady ? "sandbox foundation ready; no tasks queued" : docker.available ? "build and verify images" : "start a compatible Docker daemon"}`,
);
process.exitCode = docker.available && imagesReady ? 0 : 2;
