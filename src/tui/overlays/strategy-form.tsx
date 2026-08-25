import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Employee } from "../../domain.js";
import type {
  CreateStrategyItemInput,
  StrategyItem,
  StrategyItemKind,
} from "../../strategy/strategy-types.js";
import { NamedSelect, type NamedOption } from "../components/named-select.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import { FormFrame } from "./form-frame.js";

const REQUIRED_PARENT: Partial<Record<StrategyItemKind, StrategyItemKind>> = {
  initiative: "objective",
  project: "initiative",
  goal: "project",
  milestone: "goal",
};

export function StrategyForm(props: {
  companyId: string;
  kind: StrategyItemKind;
  items?: StrategyItem[];
  employees?: Employee[];
  terminalWidth: number;
  onSubmit: (input: CreateStrategyItemInput) => void;
  onCancel: () => void;
  initial?: StrategyItem | undefined;
}) {
  const expectedParent = REQUIRED_PARENT[props.kind];
  const [step, setStep] = useState(0);
  const [name, setName] = useState(props.initial?.name ?? "");
  const [parentId, setParentId] = useState(props.initial?.parentId ?? "");
  const [ownerId, setOwnerId] = useState(props.initial?.ownerId ?? "ceo");
  const [measures, setMeasures] = useState(props.initial?.successMeasures.join(", ") ?? "");
  const ownerItems = activeEmployees(props.employees ?? []);
  const parentItems = (props.items ?? [])
    .filter(({ kind, status }) => kind === expectedParent && status !== "archived")
    .map(({ id, name: label }) => ({ label, value: id }));
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (step === 4 && matchesKeybinding("activate", input, key))
      props.onSubmit({
        companyId: props.companyId,
        kind: props.kind,
        name: name.trim(),
        parentId: parentId || null,
        ownerId,
        managerId: ownerId,
        successMeasures: split(measures),
      });
  });
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Create"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={step === 4 ? "Enter confirm · Esc cancel" : "Enter/select next · Esc cancel"}
    >
      {step === 0 ? (
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          onNext={() => {
            setStep(expectedParent ? 1 : 2);
          }}
        />
      ) : step === 1 ? (
        parentItems.length ? (
          <NamedSelect
            label={`${expectedParent} parent`}
            items={parentItems}
            value={parentId}
            onSelect={(value) => {
              setParentId(value);
              setStep(2);
            }}
          />
        ) : (
          <Text>
            Create an active {expectedParent} before creating this {props.kind}.
          </Text>
        )
      ) : step === 2 ? (
        <NamedSelect
          label="Owner"
          items={ownerItems}
          value={ownerId}
          onSelect={(value) => {
            setOwnerId(value);
            setStep(3);
          }}
        />
      ) : step === 3 ? (
        <TextField
          label="Success measures (comma separated)"
          value={measures}
          onChange={setMeasures}
          onNext={() => {
            setStep(4);
          }}
        />
      ) : (
        <Text>Confirm {name} with measurable exit criteria? This mutation is audited.</Text>
      )}
    </FormFrame>
  );
}

function activeEmployees(employees: Employee[]): NamedOption[] {
  return employees
    .filter(({ status }) => status !== "terminated")
    .map((employee) => ({ label: `${employee.name} — ${employee.title}`, value: employee.id }));
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <Text>{props.label}</Text>
      <Box>
        <PromptMarker />
        <TextInput
          value={props.value}
          onChange={props.onChange}
          onSubmit={() => {
            if (props.value.trim()) props.onNext();
          }}
        />
      </Box>
    </>
  );
}

function split(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
