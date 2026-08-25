import { Box, Text } from "ink";
import type { MessageRecord } from "../../conversations/conversation-types.js";
import type { ConversationThread, RoomRecord } from "../../conversations/conversation-types.js";

interface ConversationViewProps {
  messages: MessageRecord[];
  rooms: RoomRecord[];
  threads: ConversationThread[];
  selectedRow?: number;
}

export function ConversationView({
  messages,
  rooms,
  threads,
  selectedRow = 0,
}: ConversationViewProps) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Conversation rooms and threads</Text>
      <Text dimColor>
        {rooms.length} rooms · {threads.length} threads in the primary room
      </Text>
      {rooms.map((room, index) => (
        <Text key={room.id} inverse={index === selectedRow} dimColor={room.status === "archived"}>
          {index === selectedRow ? "›" : " "} {room.name} · {room.kind} · {room.status}
          {room.retentionDays ? ` · ${room.retentionDays}d retention` : ""}
        </Text>
      ))}
      {threads.map((thread, index) => (
        <Text
          key={thread.id}
          inverse={rooms.length + index === selectedRow}
          dimColor={thread.status !== "open"}
        >
          {rooms.length + index === selectedRow ? "›" : " "} #{thread.title} · thread ·{" "}
          {thread.status}
        </Text>
      ))}
      <Text bold>Primary room messages</Text>
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
      <Text dimColor>
        Room and thread lifecycle is available here; messages are composed from CEO office.
      </Text>
    </Box>
  );
}
