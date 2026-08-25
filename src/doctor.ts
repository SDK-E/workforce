import { dockerImageExists, dockerStatus } from "./docker-runtime.js";

const docker = await dockerStatus();
const imagesReady = docker.available ? await dockerImageExists("workforce-agent:0.1.0") : false;
console.log("Workforce doctor");
console.log(`Docker: ${docker.available ? `available (${docker.version})` : "BLOCKED"}`);
if (!docker.available) console.log(`Reason: ${docker.reason}`);
console.log(`Agent images: ${imagesReady ? "available" : "missing — run pnpm images:build"}`);
console.log("Host agent execution: disabled by policy");
console.log(
  `Execution readiness: ${docker.available && imagesReady ? "sandbox foundation ready; no tasks queued" : docker.available ? "build and verify images" : "start a compatible Docker daemon"}`,
);
process.exitCode = docker.available && imagesReady ? 0 : 2;
