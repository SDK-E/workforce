import { readFile } from "node:fs/promises";
import { JobRequirementsSchema } from "./domain.js";
import { planSandbox } from "./sandbox-planner.js";

const separator = process.argv.indexOf("--");
const path = process.argv[separator + 1] ?? process.argv[2];
if (!path) throw new Error("Usage: pnpm sandbox:plan -- requirements/job.json");
const job = JobRequirementsSchema.parse(JSON.parse(await readFile(path, "utf8")));
console.log(JSON.stringify(planSandbox(job), null, 2));
