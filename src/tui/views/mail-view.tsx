import { Box, Text } from "ink";
import type { MailRecord } from "../../integrations/integration-types.js";

export function MailView({ mail }: { mail: MailRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Company mail</Text>
      <Text dimColor>Durable agent-to-agent and agent-to-human correspondence.</Text>
      {mail.length === 0 ? (
        <Text dimColor>No mail.</Text>
      ) : (
        mail.slice(0, 20).map((item) => (
          <Text key={item.id}>
            [{item.status}] {item.senderKind}:{item.senderId} → {item.recipientKind}:
            {item.recipientId} · {item.subject}
          </Text>
        ))
      )}
      <Text dimColor>n compose · d archive · u restore</Text>
    </Box>
  );
}
