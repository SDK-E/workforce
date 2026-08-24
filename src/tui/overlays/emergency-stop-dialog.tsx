import { ConfirmationDialog } from "./confirmation-dialog.js";

export function EmergencyStopDialog(props: {
  onStop: () => Promise<void>;
  onClose: () => void;
  onStatus: (message: string) => void;
}) {
  function confirm(): void {
    props.onClose();
    props.onStatus("Emergency stop in progress…");
    void props.onStop().then(
      () => {
        props.onStatus("Emergency stop completed and audited");
      },
      (error: unknown) => {
        props.onStatus(error instanceof Error ? error.message : "Emergency stop failed");
      },
    );
  }
  return (
    <ConfirmationDialog
      title="Emergency stop"
      message="Stop every active Workforce-managed attempt? Queued work will not start until restart."
      confirmLabel="stop active attempts"
      onCancel={props.onClose}
      onConfirm={confirm}
    />
  );
}
