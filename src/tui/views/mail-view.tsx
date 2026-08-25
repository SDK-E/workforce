import { Box, Text } from "ink";
import type { MailRecord } from "../../integrations/integration-types.js";
import type { NameDirectory } from "../names.js";

export function MailView({
  mail,
  selectedRow,
  names,
}: {
  mail: MailRecord[];
  selectedRow: number;
  names: NameDirectory;
}) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Company mail</Text>
      <Text dimColor>Durable agent-to-agent and agent-to-human correspondence.</Text>
      {mail.length === 0 ? (
        <Text dimColor>No mail.</Text>
      ) : (
        mail.slice(0, 20).map((item, index) => (
          <Text key={item.id} inverse={index === selectedRow} dimColor={item.status === "archived"}>
            [{item.status}] {party(item.senderKind, item.senderId, names)} →{" "}
            {party(item.recipientKind, item.recipientId, names)} · {item.subject}
          </Text>
        ))
      )}
    </Box>
  );
}

function party(kind: MailRecord["senderKind"], id: string, names: NameDirectory): string {
  return kind === "agent" ? names.employee(id) : id;
}
