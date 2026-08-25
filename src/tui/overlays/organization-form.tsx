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
  const [step, setStep] = useState(0);
  const [name, setName] = useState(props.initial?.name ?? "");
  const [parentId, setParentId] = useState(props.initial?.parentId ?? "");
  const [managerId, setManagerId] = useState(props.initial?.managerId ?? "");
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 3 && matchesKeybinding("activate", input, key))
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
      footer={step === 3 ? "Enter confirm · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {step === 0 ? (
        <>
          <Text>Name</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={name}
              onChange={setName}
              onSubmit={() => {
                if (name.trim()) setStep(1);
              }}
            />
          </Box>
        </>
      ) : step === 1 ? (
        <NamedSelect
          label="Parent (optional)"
          items={parentItems}
          value={parentId}
          onSelect={(value) => {
            setParentId(value);
            setStep(2);
          }}
        />
      ) : step === 2 ? (
        <NamedSelect
          label="Manager (optional)"
          items={managerItems}
          value={managerId}
          onSelect={(value) => {
            setManagerId(value);
            setStep(3);
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
