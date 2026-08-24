import { Box, Text } from "ink";
import type { MessageRecord } from "../../conversations/conversation-types.js";
import type { ConversationThread, RoomRecord } from "../../conversations/conversation-types.js";

interface ConversationViewProps {
  messages: MessageRecord[];
  rooms: RoomRecord[];
  threads: ConversationThread[];
}

export function ConversationView({ messages, rooms, threads }: ConversationViewProps) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>{rooms[0]?.name ?? "Company conversations"}</Text>
      <Text dimColor>
        {rooms.length} rooms · {threads.length} threads in the selected room
      </Text>
      {messages.length === 0 ? (
        <Text dimColor>No messages yet.</Text>
      ) : (
        messages.slice(-12).map((message) => (
          <Text key={message.id}>
            {message.pinned ? "◆ " : ""}
            {message.authorId}: {message.body}
            {message.status === "edited" ? " (edited)" : ""}
          </Text>
        ))
      )}
      <Text dimColor>Press n to compose a durable message.</Text>
    </Box>
  );
}
