import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type {
  CreateOrganizationUnitInput,
  OrganizationUnitKind,
  OrganizationUnit,
} from "../../organizations/organization-types.js";
import { FormFrame } from "./form-frame.js";

const FIELDS = ["Name", "Parent ID (optional)", "Manager ID (optional)"] as const;

export function OrganizationForm(props: {
  companyId: string;
  kind: OrganizationUnitKind;
  terminalWidth: number;
  onSubmit: (input: CreateOrganizationUnitInput) => void;
  onCancel: () => void;
  initial?: OrganizationUnit | undefined;
}) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState([
    props.initial?.name ?? "",
    props.initial?.parentId ?? "",
    props.initial?.managerId ?? "",
  ]);
  const confirming = step === FIELDS.length;
  useInput((_input, key) => {
    if (key.escape) props.onCancel();
    if (confirming && key.return) submit();
  });
  function advance(): void {
    if (step === 0 && !values[0]?.trim()) return;
    setStep((current) => current + 1);
  }
  function submit(): void {
    props.onSubmit({
      companyId: props.companyId,
      kind: props.kind,
      name: values[0]?.trim() ?? "",
      parentId: emptyToNull(values[1]),
      managerId: emptyToNull(values[2]),
    });
  }
  return (
    <FormFrame
      title={`${props.initial ? "Edit" : "Create"} ${props.kind}`}
      terminalWidth={props.terminalWidth}
      footer={confirming ? "Enter confirm · Esc cancel" : `Enter next · Esc cancel · ${step + 1}/3`}
    >
      {confirming ? (
        <Text>
          Confirm {props.initial ? "update" : "creation"} of {values[0]}? This mutation is audited.
        </Text>
      ) : (
        <>
          <Text>{FIELDS[step]}</Text>
          <Box>
            <Text color="cyan">› </Text>
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
