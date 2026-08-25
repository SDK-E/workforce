import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { IncidentRecord } from "../../governance/incident-repository.js";
import type { PerformanceRecord } from "../../governance/performance-repository.js";
import { matchesKeybinding } from "../keybindings.js";
import { PromptMarker } from "../components/prompt-marker.js";
import { FormFrame } from "./form-frame.js";

export type GovernanceFormKind =
  | "performance"
  | "recognition"
  | "incident"
  | "corrective"
  | "claim";

export type GovernanceFormResult =
  | {
      kind: "performance" | "recognition";
      employeeId: string;
      performanceKind: PerformanceRecord["kind"];
      summary: string;
      evidenceIds: string[];
    }
  | {
      kind: "incident";
      title: string;
      severity: IncidentRecord["severity"];
      summary: string;
      evidenceIds: string[];
    }
  | {
      kind: "corrective";
      employeeId: string;
      correctiveKind: "coaching" | "warning" | "restriction" | "suspension";
      rationale: string;
      evidenceIds: string[];
      incidentId: string | null;
    }
  | {
      kind: "claim";
      subjectId: string;
      predicate: string;
      value: unknown;
      evidenceIds: string[];
      confidence: number;
    };

const FIELDS: Record<GovernanceFormKind, string[]> = {
  performance: [
    "Employee ID",
    "Kind (observation, warning, review, challenge)",
    "Evidence-based summary",
    "Evidence IDs (comma separated)",
  ],
  recognition: ["Employee ID", "Recognition summary", "Evidence IDs (comma separated)"],
  incident: [
    "Incident title",
    "Severity (low, medium, high, critical)",
    "Incident summary",
    "Evidence IDs (comma separated)",
  ],
  corrective: [
    "Employee ID",
    "Action (coaching, warning, restriction, suspension)",
    "Evidence-based rationale",
    "Evidence IDs (comma separated)",
    "Related incident ID (or none)",
  ],
  claim: [
    "Subject ID",
    "Predicate",
    "Value (JSON)",
    "Evidence IDs (comma separated)",
    "Confidence (0 to 1)",
  ],
};

export function GovernanceForm(props: {
  kind: GovernanceFormKind;
  terminalWidth: number;
  onSubmit: (result: GovernanceFormResult) => void;
  onCancel: () => void;
}) {
  const fields = FIELDS[props.kind];
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => defaults(props.kind));
  const [error, setError] = useState("");
  const confirming = step === fields.length;
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (confirming && matchesKeybinding("activate", input, key)) submit();
  });
  function submit(): void {
    try {
      props.onSubmit(buildResult(props.kind, values));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Invalid governance record");
      setStep(0);
    }
  }
  return (
    <FormFrame
      title={titleFor(props.kind)}
      terminalWidth={props.terminalWidth}
      footer={
        confirming
          ? "Enter persist and audit · Esc cancel"
          : `Enter next · Esc cancel · ${step + 1}/${fields.length}`
      }
    >
      {error && <Text color="red">{error}</Text>}
      {confirming ? (
        <Text>Persist this evidence-backed {props.kind} record?</Text>
      ) : (
        <>
          <Text>{fields[step]}</Text>
          <Box>
            <PromptMarker />
            <TextInput
              value={values[step] ?? ""}
              onChange={(value) => {
                setValues((current) =>
                  current.map((item, index) => (index === step ? value : item)),
                );
              }}
              onSubmit={() => {
                if ((values[step] ?? "").trim()) setStep((current) => current + 1);
              }}
            />
          </Box>
        </>
      )}
    </FormFrame>
  );
}

function defaults(kind: GovernanceFormKind): string[] {
  if (kind === "performance") return ["", "observation", "", ""];
  if (kind === "recognition") return ["", "", ""];
  if (kind === "incident") return ["", "medium", "", ""];
  if (kind === "corrective") return ["", "coaching", "", "", "none"];
  return ["", "", "true", "", "0.8"];
}

function buildResult(kind: GovernanceFormKind, values: string[]): GovernanceFormResult {
  if (kind === "performance" || kind === "recognition") {
    const offset = kind === "performance" ? 1 : 0;
    return {
      kind,
      employeeId: required(values[0], "Employee ID"),
      performanceKind: kind === "recognition" ? "recognition" : performanceKind(values[1]),
      summary: required(values[1 + offset], "Summary"),
      evidenceIds: evidence(values[2 + offset]),
    };
  }
  if (kind === "incident")
    return {
      kind,
      title: required(values[0], "Title"),
      severity: severity(values[1]),
      summary: required(values[2], "Summary"),
      evidenceIds: evidence(values[3]),
    };
  if (kind === "corrective")
    return {
      kind,
      employeeId: required(values[0], "Employee ID"),
      correctiveKind: correctiveKind(values[1]),
      rationale: required(values[2], "Rationale"),
      evidenceIds: evidence(values[3]),
      incidentId:
        values[4]?.trim().toLowerCase() === "none" ? null : required(values[4], "Incident ID"),
    };
  const confidence = Number(values[4]);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
    throw new Error("Confidence must be between zero and one");
  return {
    kind,
    subjectId: required(values[0], "Subject ID"),
    predicate: required(values[1], "Predicate"),
    value: parseJson(values[2]),
    evidenceIds: evidence(values[3]),
    confidence,
  };
}

function titleFor(kind: GovernanceFormKind): string {
  if (kind === "performance") return "Record performance evidence";
  if (kind === "recognition") return "Record recognition";
  if (kind === "incident") return "Report incident";
  if (kind === "corrective") return "Draft corrective action";
  return "Assert evidence-backed claim";
}

function required(value: string | undefined, label: string): string {
  const result = value?.trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}

function evidence(value: string | undefined): string[] {
  const result = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (result.length === 0) throw new Error("At least one evidence ID is required");
  return result;
}

function performanceKind(value: string | undefined): PerformanceRecord["kind"] {
  const allowed = ["observation", "warning", "review", "challenge"] as const;
  const result = value?.trim();
  if (!allowed.some((candidate) => candidate === result))
    throw new Error("Performance kind must be observation, warning, review, or challenge");
  return result as PerformanceRecord["kind"];
}

function severity(value: string | undefined): IncidentRecord["severity"] {
  const allowed = ["low", "medium", "high", "critical"] as const;
  const result = value?.trim();
  if (!allowed.some((candidate) => candidate === result))
    throw new Error("Severity must be low, medium, high, or critical");
  return result as IncidentRecord["severity"];
}

function correctiveKind(
  value: string | undefined,
): "coaching" | "warning" | "restriction" | "suspension" {
  const allowed = ["coaching", "warning", "restriction", "suspension"] as const;
  const result = value?.trim();
  if (!allowed.some((candidate) => candidate === result))
    throw new Error("Action must be coaching, warning, restriction, or suspension");
  return result as (typeof allowed)[number];
}

function parseJson(value: string | undefined): unknown {
  try {
    return JSON.parse(value ?? "null") as unknown;
  } catch {
    throw new Error("Claim value must be valid JSON");
  }
}
