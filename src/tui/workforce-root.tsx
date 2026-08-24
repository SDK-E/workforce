import { useState } from "react";
import { Box, Text, useStdout } from "ink";
import type { DockerStatus } from "../docker-runtime.js";
import type { CompanyRecord } from "../storage/records.js";
import type { StateStore } from "../storage/state-store.js";
import { CompanyCreateForm } from "./overlays/company-create-form.js";
import { WorkforceApp } from "./workforce-app.js";

export function WorkforceRoot(props: {
  store: StateStore;
  docker: DockerStatus;
  onEmergencyStop: () => Promise<void>;
  onStartTask: (companyId: string, taskId: string) => Promise<void>;
}) {
  const { stdout } = useStdout();
  const [company, setCompany] = useState<CompanyRecord | null>(props.store.companies()[0] ?? null);
  const [message, setMessage] = useState("Create the first company to begin autonomous operation");
  if (company) return <WorkforceApp {...props} initialCompany={company} />;
  return (
    <Box width={stdout.columns} height={stdout.rows} flexDirection="column">
      <Text bold>Workforce OS onboarding</Text>
      <Text>{message}</Text>
      <CompanyCreateForm
        terminalWidth={stdout.columns}
        onCancel={() => {
          setMessage("A persisted company configuration is required to continue");
        }}
        onSubmit={(input) => {
          try {
            setCompany(props.store.createCompany(input));
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Company creation failed");
          }
        }}
      />
    </Box>
  );
}
