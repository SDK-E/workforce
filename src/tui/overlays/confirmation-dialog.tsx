import { Box, Text, useInput } from "ink";
import { ModalBackdrop } from "../components/modal-backdrop.js";

export function ConfirmationDialog(props: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((input, key) => {
    if (key.escape || input.toLowerCase() === "n") props.onCancel();
    if (input.toLowerCase() === "y") props.onConfirm();
  });
  return (
    <ModalBackdrop width={58}>
      <Box
        width="100%"
        backgroundColor="black"
        borderStyle="double"
        borderColor="red"
        flexDirection="column"
        paddingX={2}
      >
        <Text bold>{props.title}</Text>
        <Text>{props.message}</Text>
        <Text color="yellow">y {props.confirmLabel} · n/Esc cancel</Text>
      </Box>
    </ModalBackdrop>
  );
}
