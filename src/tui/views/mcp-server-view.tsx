import { Box, Text } from "ink";
import type { McpServerRecord } from "../../integrations/integration-types.js";

export function McpServerView({ servers }: { servers: McpServerRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>MCP server registry</Text>
      <Text dimColor>Company-scoped servers; tasks receive only explicit server/tool grants.</Text>
      {servers.length === 0 ? (
        <Text dimColor>No MCP servers registered.</Text>
      ) : (
        servers.map((server) => (
          <Text key={server.id}>
            [{server.status}] {server.name} · {server.transport} · {server.health} · tools{" "}
            {server.toolAllowlist.join(", ") || "none"}
          </Text>
        ))
      )}
      <Text dimColor>n register · e edit · d archive · u restore</Text>
    </Box>
  );
}
