import type { CompanyRecord } from "../../storage/records.js";
import type { StateStore } from "../../storage/state-store.js";
import { CommandPalette } from "./command-palette.js";
import { CreateOverlay, type CreateFormKind } from "./create-overlay.js";
import { EmergencyStopDialog } from "./emergency-stop-dialog.js";
import { HelpOverlay } from "./help-overlay.js";
import { ConfirmationDialog } from "./confirmation-dialog.js";
import { lifecycleVerb, type LifecycleTarget } from "../lifecycle-actions.js";

export function WorkforceOverlays(props: {
  paletteVisible: boolean;
  helpVisible: boolean;
  emergencyVisible: boolean;
  executionTask: { id: string; objective: string } | null;
  lifecycleTarget: LifecycleTarget | null;
  activeForm: CreateFormKind | null;
  query: string;
  compact: boolean;
  terminalWidth: number;
  section: string;
  company: CompanyRecord;
  store: StateStore;
  onCompanyChange: (company: CompanyRecord) => void;
  onCloseForm: () => void;
  onCloseEmergency: () => void;
  onStatus: (message: string) => void;
  onEmergencyStop: () => Promise<void>;
  onConfirmExecution: () => void;
  onCancelExecution: () => void;
  onConfirmLifecycle: () => void;
  onCancelLifecycle: () => void;
}) {
  return (
    <>
      {props.paletteVisible && (
        <CommandPalette query={props.query} terminalWidth={props.terminalWidth} />
      )}
      {props.helpVisible && (
        <HelpOverlay compact={props.compact} terminalWidth={props.terminalWidth} />
      )}
      {props.activeForm && (
        <CreateOverlay
          kind={props.activeForm}
          section={props.section}
          company={props.company}
          store={props.store}
          terminalWidth={props.terminalWidth}
          onCompanyChange={props.onCompanyChange}
          onClose={props.onCloseForm}
          onStatus={props.onStatus}
        />
      )}
      {props.emergencyVisible && (
        <EmergencyStopDialog
          onStop={props.onEmergencyStop}
          onClose={props.onCloseEmergency}
          onStatus={props.onStatus}
        />
      )}
      {props.executionTask && (
        <ConfirmationDialog
          title="Start agent execution"
          message={`Queue an audited Docker attempt for “${props.executionTask.objective}”?`}
          confirmLabel="queue attempt"
          onConfirm={props.onConfirmExecution}
          onCancel={props.onCancelExecution}
        />
      )}
      {props.lifecycleTarget && (
        <ConfirmationDialog
          title={`${lifecycleVerb(props.lifecycleTarget) === "archive" ? "Archive" : "Restore"} record`}
          message={`${lifecycleVerb(props.lifecycleTarget) === "archive" ? "Archive" : "Restore"} “${props.lifecycleTarget.label}”? The record and audit history will be preserved.`}
          confirmLabel={lifecycleVerb(props.lifecycleTarget)}
          onConfirm={props.onConfirmLifecycle}
          onCancel={props.onCancelLifecycle}
        />
      )}
    </>
  );
}
