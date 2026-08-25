import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { useWorkforceTheme } from "../themes/theme-context.js";
import TextInput from "ink-text-input";
import type { ProjectIntegrationRecord } from "../../integrations/integration-types.js";
import type { StrategyItem } from "../../strategy/strategy-types.js";
import { NamedSelect } from "../components/named-select.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, useFormSteps } from "../use-form-steps.js";

const FIELDS = ["Project", "Provider (for example beads)", "Configuration JSON", "Secret names"];

export function ProjectIntegrationForm(props: {
  companyId: string;
  terminalWidth: number;
  projects?: StrategyItem[];
  onSubmit: (input: Omit<ProjectIntegrationRecord, "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initial?: ProjectIntegrationRecord | undefined;
}) {
  const theme = useWorkforceTheme();
  const steps = useFormSteps(FIELDS.length);
  const [values, setValues] = useState(
    props.initial
      ? [
          props.initial.projectId,
          props.initial.provider,
          JSON.stringify(props.initial.config),
          props.initial.secretRequirements.join(", "),
        ]
      : ["", "beads", "{}", ""],
  );
  const selectStep = steps.step === 0 && !steps.confirming;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (steps.confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    try {
      const config = JSON.parse(values[2]?.trim() ? values[2] : "{}") as unknown;
      if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error();
      props.onSubmit({
        companyId: props.companyId,
        projectId: props.initial?.projectId ?? values[0]?.trim() ?? "",
        provider: props.initial?.provider ?? values[1]?.trim() ?? "",
        config: config as Record<string, unknown>,
        secretRequirements: splitList(values[3]),
        status: props.initial?.status ?? "active",
      });
    } catch {
      steps.fail("Configuration must be a JSON object");
    }
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Configure"} project integration`}
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, FIELDS.length, { selectStep })}
    >
      {steps.error && <Text color={theme.colors.danger}>{steps.error}</Text>}
      {steps.confirming ? (
        <Text>
          Activate {values[1]} only for project {values[0]}?
        </Text>
      ) : steps.step === 0 ? (
        props.projects?.length ? (
          <NamedSelect
            label="Project"
            items={props.projects.map(({ id, name }) => ({ label: name, value: id }))}
            value={values[0] ?? ""}
            onSelect={(value) => {
              setValues((current) => current.map((item, index) => (index === 0 ? value : item)));
              steps.advance();
            }}
          />
        ) : (
          <Text>Create an active project before configuring a project integration.</Text>
        )
      ) : (
        <>
          <Text>{FIELDS[steps.step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[steps.step] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === steps.step ? value : item)),
                );
                steps.fail("");
              }}
              onSubmit={() => {
                if ((values[steps.step] ?? "").trim() || steps.step === 3) steps.advance();
                else steps.fail(`${FIELDS[steps.step]} is required`);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
