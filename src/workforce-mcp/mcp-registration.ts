import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WorkforceMcpCapability } from "./mcp-principal.js";

export interface CapabilityTool {
  capability: WorkforceMcpCapability;
  tool: RegisteredTool;
}

export function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: boundedJson(value) }] };
}

export function registerJsonResource(
  server: McpServer,
  name: string,
  uri: string,
  read: () => unknown,
): void {
  server.registerResource(name, uri, { mimeType: "application/json" }, () => ({
    contents: [{ uri, mimeType: "application/json", text: boundedJson(read()) }],
  }));
}

function boundedJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded, "utf8") > 100_000)
    throw new Error("MCP result exceeds the 100 KB response limit");
  return encoded;
}
