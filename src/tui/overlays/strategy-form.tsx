import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { PromptMarker } from "../components/prompt-marker.js";
import { matchesKeybinding } from "../keybindings.js";
import TextInput from "ink-text-input";
import type {
  CreateStrategyItemInput,
  StrategyItem,
  StrategyItemKind,
} from "../../strategy/strategy-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = ["Name", "Parent ID (optional)", "Owner ID", "Success measures (comma separated)"];

export function StrategyForm(props: {
  companyId: string;
  kind: StrategyItemKind;
  terminalWidth: number;
  onSubmit: (input: CreateStrategyItemInput) => void;
  onCancel: () => void;
  initial?: StrategyItem | undefined;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    props.initial?.name ?? "",
    props.initial?.parentId ?? "",
    props.initial?.ownerId ?? "ceo",
    props.initial?.successMeasures.join(", ") ?? "",
  ]);
  const confirming = step === FIELDS.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function advance(): void {
    if ([0, 2, 3].includes(step) && !values[step]?.trim()) return;
    setStep((current) => current + 1);
  }
  function submit(): void {
    const ownerId = values[2]?.trim() ?? "ceo";
    props.onSubmit({
      companyId: props.companyId,
      kind: props.kind,
      name: values[0]?.trim() ?? "",
      parentId: emptyToNull(values[1]),
      ownerId,
      managerId: ownerId,
      successMeasures: (values[3] ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Create"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={confirming ? "Enter confirm · Esc cancel" : `Enter next · Esc cancel · ${step + 1}/4`}
    >
      {confirming ? (
        <Text>Confirm {values[0]} with measurable exit criteria? This mutation is audited.</Text>
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[step] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === step ? value : item)),
                );
              }}
              onSubmit={advance}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : null;
}
