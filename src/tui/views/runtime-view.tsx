import { Box, Text } from "ink";
import type { DockerStatus } from "../../docker-runtime.js";

const PROFILES = ["document", "research", "engineering", "browser", "restricted-review"];
const TOOLS = ["scoped search", "shell", "GitHub CLI", "Vercel CLI", "browser"];

export function RuntimeView({ section, docker }: { section: string; docker: DockerStatus }) {
  const rows =
    section === "Tools"
      ? TOOLS
      : section === "Environments"
        ? PROFILES.map((profile) => `${profile} · private named volume · read-only root`)
        : section === "Models & engines"
          ? ["Kilo · verified adapter", "OpenCode · verified adapter", "circuit-breaker failover"]
          : [
              `Docker ${docker.available ? `available · ${docker.version ?? "version unknown"}` : "blocked"}`,
              "two active containers by default · memory-pressure reduction enabled",
              "host execution disabled · managed orphan cleanup enabled",
            ];
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{section}</Text>
      {rows.map((row) => (
        <Text key={row}>• {row}</Text>
      ))}
      {section === "Tools" && (
        <Text dimColor>Capabilities are granted per approved sandbox plan.</Text>
      )}
    </Box>
  );
}
