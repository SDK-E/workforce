import { Box, Text } from "ink";
import type { MessageRecord } from "../../storage/records.js";

export function ConversationView({ messages }: { messages: MessageRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>CEO office conversation</Text>
      {messages.length === 0 ? (
        <Text dimColor>No messages yet.</Text>
      ) : (
        messages.slice(-12).map((message) => (
          <Text key={message.id}>
            {message.authorId}: {message.body}
          </Text>
        ))
      )}
      <Text dimColor>Press n to compose a durable message.</Text>
    </Box>
  );
}
