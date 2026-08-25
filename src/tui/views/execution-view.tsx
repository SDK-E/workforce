import { Box, Text } from "ink";
import type { ArtifactRecord } from "../../acceptance/artifact-types.js";
import { truncate } from "../navigation.js";

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
