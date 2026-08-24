import { readFile } from "node:fs/promises";
import { designAgentForJob } from "./agent-designer.js";
import { JobRequirementsSchema } from "./domain.js";

const separator = process.argv.indexOf("--");
const path = process.argv[separator + 1] ?? process.argv[2];
if (!path) throw new Error("Usage: pnpm arm:design -- requirements/job.json");
const job = JobRequirementsSchema.parse(JSON.parse(await readFile(path, "utf8")));
console.log(JSON.stringify(designAgentForJob(job), null, 2));

