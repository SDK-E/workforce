import { Box, Text } from "ink";
import type { DockerStatus } from "../../docker-runtime.js";
import type {
  EnvironmentRecord,
  ModelRecord,
  ToolRecord,
} from "../../registries/registry-types.js";
import { DEFAULT_AGENT_CONCURRENCY } from "../../supervision/capacity-controller.js";
import { bindingsFor } from "../keybindings.js";

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
        <Text dimColor>
          {bindingsFor("create")} configure · {bindingsFor("edit")} edit · {bindingsFor("verify")}{" "}
          verify with Docker inference
        </Text>
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
    `up to ${DEFAULT_AGENT_CONCURRENCY} concurrent agent containers · reduced under memory pressure`,
    "host execution disabled · managed orphan cleanup enabled",
  ];
}
