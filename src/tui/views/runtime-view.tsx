import { Box, Text } from "ink";
import type { DockerStatus } from "../../docker-runtime.js";
import type {
  EnvironmentRecord,
  ModelRecord,
  ToolRecord,
} from "../../registries/registry-types.js";

interface RuntimeViewProps {
  section: string;
  docker: DockerStatus;
  tools: ToolRecord[];
  environments: EnvironmentRecord[];
  models: ModelRecord[];
  selectedRow?: number;
}

export function RuntimeView(props: RuntimeViewProps) {
  const rows = rowsForSection(props);
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{props.section}</Text>
      {rows.length === 0 && <Text>No company-scoped registry records.</Text>}
      {rows.map((row, index) => (
        <Text key={row} inverse={props.selectedRow === index}>
          {props.selectedRow === index ? "›" : "•"} {row}
        </Text>
      ))}
      {props.section === "Tools" && (
        <Text dimColor>Capabilities are granted per approved sandbox plan.</Text>
      )}
      {props.section === "Models & engines" && (
        <Text dimColor>n configure · e edit · [] select · verify before execution</Text>
      )}
    </Box>
  );
}

function rowsForSection(props: RuntimeViewProps): string[] {
  if (props.section === "Tools")
    return props.tools.map(
      (tool) =>
        `${tool.id}@${tool.version} · ${tool.health} · ${tool.risk} risk · ${tool.capabilities.join(", ")}`,
    );
  if (props.section === "Environments")
    return props.environments.map(
      (environment) => `${environment.id} · ${environment.health} · ${environment.sandboxImage}`,
    );
  if (props.section === "Models & engines")
    return props.models.map(
      (model) => `${model.engine} · ${model.model} · ${model.health} · priority ${model.priority}`,
    );
  return [
    `Docker ${props.docker.available ? `available · ${props.docker.version ?? "version unknown"}` : "blocked"}`,
    "two active containers by default · memory-pressure reduction enabled",
    "host execution disabled · managed orphan cleanup enabled",
  ];
}
