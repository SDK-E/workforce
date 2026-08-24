import { Box, Text } from "ink";
import type { DockerStatus } from "../../docker-runtime.js";
import { truncate } from "../navigation.js";

interface TopBarProps {
  companyName: string;
  docker: DockerStatus;
  pendingApprovals: number;
}

export function TopBar({ companyName, docker, pendingApprovals }: TopBarProps) {
  return (
    <Box paddingX={1} justifyContent="space-between" backgroundColor="blue">
      <Text bold> WORKFORCE {truncate(companyName, 22)}</Text>
      <Text>
        Docker {docker.available ? "● ready" : "! blocked"} Agents 0/2 Decisions {pendingApprovals}{" "}
        Alerts {docker.available ? 0 : 1}
      </Text>
    </Box>
  );
}
