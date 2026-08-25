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
import {
  formFooter,
  isFieldBack,
  isFieldForward,
  splitList,
  useFormSteps,
} from "../use-form-steps.js";

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
  const lastStep = 4;
  const steps = useFormSteps(lastStep);
  const [name, setName] = useState(props.initial?.name ?? "");
  const [parentId, setParentId] = useState(props.initial?.parentId ?? "");
  const [ownerId, setOwnerId] = useState(props.initial?.ownerId ?? "ceo");
  const [measures, setMeasures] = useState(props.initial?.successMeasures.join(", ") ?? "");
  const ownerItems = activeEmployees(props.employees ?? []);
  const parentItems = (props.items ?? [])
    .filter(({ kind, status }) => kind === expectedParent && status !== "archived")
    .map(({ id, name: label }) => ({ label, value: id }));
  const selectStep = !steps.confirming && [1, 2].includes(steps.step);
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (isFieldBack(input, key, selectStep)) steps.retreat();
    if (!steps.confirming && steps.step === 0 && isFieldForward(input, key, false)) advanceName();
    if (!steps.confirming && steps.step === 3 && isFieldForward(input, key, false))
      advanceText(measures, "Success measures");
    if (steps.confirming && matchesKeybinding("activate", input, key))
      props.onSubmit({
        companyId: props.companyId,
        kind: props.kind,
        name: name.trim(),
        parentId: parentId || null,
        ownerId,
        managerId: ownerId,
        successMeasures: splitList(measures),
      });
  });
  function advanceName(): void {
    if (!name.trim()) {
      steps.fail("Name is required");
      return;
    }
    if (expectedParent) steps.advance();
    else steps.goTo(2);
  }
  function advanceText(value: string, label: string): void {
    if (value.trim()) steps.advance();
    else steps.fail(`${label} are required`);
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Create"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={formFooter(steps.confirming, steps.step, lastStep, { selectStep })}
    >
      {steps.error && <Text color="red">{steps.error}</Text>}
      {steps.step === 0 && !steps.confirming ? (
        <TextField
          label="Name"
          value={name}
          onChange={(value) => {
            setName(value);
            steps.fail("");
          }}
          onNext={advanceName}
        />
      ) : steps.step === 1 && !steps.confirming ? (
        parentItems.length ? (
          <NamedSelect
            label={`${expectedParent} parent`}
            items={parentItems}
            value={parentId}
            onSelect={(value) => {
              setParentId(value);
              steps.advance();
            }}
          />
        ) : (
          <Text>
            Create an active {expectedParent} before creating this {props.kind}.
          </Text>
        )
      ) : steps.step === 2 && !steps.confirming ? (
        <NamedSelect
          label="Owner"
          items={ownerItems}
          value={ownerId}
          onSelect={(value) => {
            setOwnerId(value);
            steps.advance();
          }}
        />
      ) : steps.step === 3 && !steps.confirming ? (
        <TextField
          label="Success measures (comma separated)"
          value={measures}
          onChange={(value) => {
            setMeasures(value);
            steps.fail("");
          }}
          onNext={() => {
            advanceText(measures, "Success measures");
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
        <TextInput value={props.value} onChange={props.onChange} onSubmit={props.onNext} />
      </Box>
    </>
  );
}
