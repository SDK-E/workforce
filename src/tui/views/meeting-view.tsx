import { Box, Text } from "ink";
import type { MeetingRecord } from "../../governance/meeting-repository.js";

export function MeetingView({ meetings }: { meetings: MeetingRecord[] }) {
  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      <Text bold>Meetings and action governance</Text>
      {meetings.length === 0 ? (
        <Text dimColor>No meetings scheduled.</Text>
      ) : (
        meetings.map((meeting) => (
          <Box key={meeting.id} flexDirection="column" marginTop={1}>
            <Text>
              [{meeting.status}] {meeting.title}
            </Text>
            <Text dimColor>
              {meeting.participantIds.length} participants · {meeting.agenda.length} agenda items ·
              organizer {meeting.organizerId}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
