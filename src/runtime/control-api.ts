import { createServer, type IncomingMessage, type Server } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ControlPlaneRuntime } from "./control-plane-runtime.js";

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("emergency-stop") }),
  z.object({ action: z.literal("start-task"), companyId: z.string(), taskId: z.string() }),
  z.object({ action: z.literal("verify-mcp"), companyId: z.string(), serverId: z.string() }),
  z.object({ action: z.literal("verify-model"), companyId: z.string(), modelId: z.string() }),
]);

export class ControlApi {
  private server: Server | undefined;

  constructor(
    private readonly runtime: ControlPlaneRuntime,
    private readonly token: string,
    private readonly host: string,
    private readonly port: number,
  ) {}

  async start(): Promise<void> {
    this.server = createServer((request, response) => {
      void (async () => {
        try {
          if (!authorized(request.headers.authorization, this.token)) {
            response.writeHead(401).end();
            return;
          }
          if (request.method === "GET" && request.url === "/health") {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ status: "ready" }));
            return;
          }
          if (request.method === "GET" && request.url?.startsWith("/model-catalog")) {
            const engine = new URL(request.url, "http://localhost").searchParams.get("engine");
            if (engine !== "opencode" && engine !== "kilo")
              throw new Error("engine must be opencode or kilo");
            const models = await this.runtime.modelCatalog.catalog(engine);
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ engine, models }));
            return;
          }
          if (request.method !== "POST" || request.url !== "/actions") {
            response.writeHead(404).end();
            return;
          }
          const action = Action.parse(await body(request));
          await this.execute(action);
          response.writeHead(204).end();
        } catch (error) {
          response.writeHead(400, { "content-type": "application/json" });
          response.end(
            JSON.stringify({ error: error instanceof Error ? error.message : "failed" }),
          );
        }
      })();
    });
    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(this.port, this.host, resolve);
    });
  }

  async close(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private async execute(action: z.infer<typeof Action>): Promise<void> {
    if (action.action === "emergency-stop") return this.runtime.supervisor.emergencyStop("human");
    if (action.action === "start-task")
      void (await this.runtime.taskExecution.start(action.companyId, action.taskId, "human"));
    else if (action.action === "verify-mcp")
      void (await this.runtime.mcpVerifier.verify(action.companyId, action.serverId, "human"));
    else void (await this.runtime.modelVerifier.verify(action.companyId, action.modelId, "human"));
  }
}

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += value.length;
    if (size > 65_536) throw new Error("Control request is too large");
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function authorized(header: string | undefined, token: string): boolean {
  const supplied = Buffer.from(header?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
