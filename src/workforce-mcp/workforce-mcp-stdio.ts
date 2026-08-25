import { readFileSync } from "node:fs";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { StateStore } from "../storage/state-store.js";
import { createWorkforceMcpServer } from "./workforce-mcp-server.js";

const Config = z.object({
  stateRoot: z.string().optional(),
  principal: z.object({
    id: z.string().min(1).max(100),
    role: z.enum(["human-admin", "ceo", "arm", "manager", "employee", "reviewer"]),
    companyIds: z.array(z.string().min(1).max(64)).min(1),
    employeeId: z.string().nullable(),
    capabilities: z.array(
      z.enum([
        "company:read",
        "task:read",
        "message:read",
        "message:write",
        "mail:read",
        "mail:write",
        "meeting:read",
        "meeting:write",
        "checkpoint:write",
        "attempt:read",
        "deliverable:read",
        "decision:read",
        "audit:read",
        "work:mutate",
        "workforce:manage",
        "company:manage",
        "emergency:stop",
      ]),
    ),
  }),
});

const configPath = process.argv[2];
if (!configPath) throw new Error("Usage: workforce-mcp <config.json>");
const config = Config.parse(JSON.parse(readFileSync(configPath, "utf8")));
const store = new StateStore(config.stateRoot);
store.initialize();
const server = createWorkforceMcpServer(store, config.principal);
await server.connect(new StdioServerTransport());

for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void server.close().finally(() => {
      store.close();
      process.exit(0);
    });
  });
