import { dockerStatus } from "./docker-runtime.js";
import { spawn } from "node:child_process";

async function imageExists(image: string): Promise<boolean> {
  return await new Promise((resolve) => {
    const child = spawn("docker", ["image", "inspect", image], { stdio: "ignore" });
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}

const docker = await dockerStatus();
const images = docker.available
  ? await Promise.all([
      imageExists("workforce-agent-base:0.1.0"),
      imageExists("workforce-agent-builder:0.1.0"),
      imageExists("workforce-agent-reviewer:0.1.0"),
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
