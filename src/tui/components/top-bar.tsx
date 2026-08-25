import { Box, Text } from "ink";
import type { DockerStatus } from "../../docker-runtime.js";
import { truncate } from "../navigation.js";
import { useWorkforceTheme } from "../themes/theme-context.js";

interface TopBarProps {
  companyName: string;
  docker: DockerStatus;
  pendingApprovals: number;
  activeAttempts: number;
  queuedAttempts: number;
  capacity: number;
}

export function TopBar(props: TopBarProps) {
  const theme = useWorkforceTheme();
  return (
    <Box paddingX={1} justifyContent="space-between" backgroundColor={theme.colors.primary}>
      <Text bold> WORKFORCE {truncate(props.companyName, 22)}</Text>
      <Text>
        Docker {props.docker.available ? "● ready" : "! blocked"} · Attempts {props.activeAttempts}/
        {props.capacity} · Queue {props.queuedAttempts} · Decisions {props.pendingApprovals}
      </Text>
    </Box>
  );
}
