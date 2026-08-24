import React from "react";
import { Box, Text, render, useInput } from "ink";
import { dockerStatus, type DockerStatus } from "./docker-runtime.js";
import { StateStore } from "./state.js";

function App({ docker, eventCount }: { docker: DockerStatus; eventCount: number }) {
  useInput((input) => { if (input === "q") process.exit(0); });
  return <Box flexDirection="column" padding={1}>
    <Text bold>Workforce Control Plane</Text>
    <Text color={docker.available ? "green" : "yellow"}>Execution: {docker.available ? "Docker available" : "blocked — Docker daemon unavailable"}</Text>
    <Text>Host agent execution: disabled</Text>
    <Text>Tasks: 0</Text>
    <Text>Running agents: 0</Text>
    <Text>Durable identities: CEO, Agent Resources Manager</Text>
    <Text>Audit events: {eventCount}</Text>
    <Box marginTop={1}><Text dimColor>Press q to quit. No agents are started by this screen.</Text></Box>
  </Box>;
}

const state = new StateStore();
await state.initialize();
const existing = await state.events();
if (!existing.some((event) => event.type === "organization.bootstrapped")) await state.bootstrapOrganization("default", "Default Organization");
render(<App docker={await dockerStatus()} eventCount={(await state.events()).length} />);

