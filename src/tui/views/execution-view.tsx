import { Box, Text } from "ink";
import { useWorkforceTheme } from "../themes/theme-context.js";
import type { ArtifactRecord } from "../../acceptance/artifact-types.js";
import type { AttemptRecord } from "../../supervision/attempt-types.js";
import { truncate } from "../navigation.js";

export function LiveWorkView({ attempts }: { attempts: AttemptRecord[] }) {
  const theme = useWorkforceTheme();
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Live work and execution queue</Text>
      <Text dimColor>{attempts.length} durable attempts · capacity defaults to two</Text>
      {attempts.length === 0 ? (
        <Text>No execution attempts have been queued.</Text>
      ) : (
        attempts.slice(0, 20).map((attempt) => (
          <Text
            key={attempt.id}
            color={attempt.status === "failed" ? theme.colors.danger : theme.colors.text}
          >
            [{attempt.status}] {attempt.taskId} · {attempt.sandbox.engine} ·{" "}
            {attempt.sandbox.profile}
          </Text>
        ))
      )}
    </Box>
  );
}

export function DeliverableView({ artifacts }: { artifacts: ArtifactRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Validated deliverables</Text>
      <Text dimColor>Only safely exported, hashed artifacts appear here.</Text>
      {artifacts.length === 0 ? (
        <Text>No validated deliverables.</Text>
      ) : (
        artifacts.slice(0, 20).map((artifact) => (
          <Box key={artifact.id} flexDirection="column">
            <Text>{truncate(artifact.relativePath, 70)}</Text>
            <Text dimColor>
              {artifact.mediaType} · {artifact.sizeBytes} bytes · sha256{" "}
              {artifact.sha256.slice(0, 12)}…
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
