import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Employee } from "../../domain.js";
import type {
  CreateOrganizationUnitInput,
  OrganizationUnit,
  OrganizationUnitKind,
} from "../../organizations/organization-types.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { NamedSelect } from "../components/named-select.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";
import { formFooter, isFieldBack, useFormSteps } from "../use-form-steps.js";

export function OrganizationForm(props: {
  companyId: string;
  kind: OrganizationUnitKind;
  units?: OrganizationUnit[];
  employees?: Employee[];
  terminalWidth: number;
  onSubmit: (input: CreateOrganizationUnitInput) => void;
  onCancel: () => void;
  initial?: OrganizationUnit | undefined;
}) {
  const steps = useFormSteps(3);
  const [name, setName] = useState(props.initial?.name ?? "");
  const [parentId, setParentId] = useState(props.initial?.parentId ?? "");
  const [managerId, setManagerId] = useState(props.initial?.managerId ?? "");
  const selectStep = !steps.confirming && [1, 2].includes(steps.step);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({
        companyId: props.companyId,
        kind: props.kind,
        name: name.trim(),
        parentId: parentId || null,
        managerId: managerId || null,
      });
  });
  const parentItems = [
    { label: "No parent", value: "" },
    ...(props.units ?? [])
      .filter(({ id, status }) => id !== props.initial?.id && status === "active")
      .map((unit) => ({ label: `${unit.name} — ${unit.kind}`, value: unit.id })),
  ];
  const managerItems = [
    { label: "No manager", value: "" },
    ...(props.employees ?? [])
      .filter(({ status }) => status !== "terminated")
      .map((employee) => ({
        label: `${employee.name} — ${employee.title}`,
        value: employee.id,
      })),
  ];
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Create"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, 3, { selectStep })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.step === 0 && !steps.confirming ? (
        <>
          <Text>Name</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={name}
              onChange={(value) => {
                setName(value);
                steps.fail("");
              }}
              onSubmit={() => {
                if (name.trim()) steps.advance();
                else steps.fail("Name is required");
              }}
            />
          </Box>
        </>
      ) : steps.step === 1 && !steps.confirming ? (
        <NamedSelect
          label="Parent (optional)"
          items={parentItems}
          value={parentId}
          onSelect={(value) => {
            setParentId(value);
            steps.advance();
          }}
        />
      ) : steps.step === 2 && !steps.confirming ? (
        <NamedSelect
          label="Manager (optional)"
          items={managerItems}
          value={managerId}
          onSelect={(value) => {
            setManagerId(value);
            steps.advance();
          }}
        />
      ) : (
        <Text>
          Confirm {props.initial ? "update" : "creation"} of {name}? This mutation is audited.
        </Text>
      )}
    </FormFrame>
  );
}
