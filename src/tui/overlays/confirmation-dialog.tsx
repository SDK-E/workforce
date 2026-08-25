import { Box, Text, useInput } from "ink";
import { ModalBackdrop } from "../components/modal-backdrop.js";
import { matchesKeybinding } from "../keybindings.js";
import { useWorkforceTheme } from "../themes/theme-context.js";

export function ConfirmationDialog(props: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useWorkforceTheme();
  useInput((input, key) => {
    if (matchesKeybinding("cancel", input, key)) props.onCancel();
    if (matchesKeybinding("confirm", input, key)) props.onConfirm();
  });
  return (
    <ModalBackdrop width={58}>
      <Box
        width="100%"
        backgroundColor={theme.colors.canvas}
        borderStyle="double"
        borderColor={theme.colors.danger}
        flexDirection="column"
        paddingX={2}
      >
        <Text bold>{props.title}</Text>
        <Text>{props.message}</Text>
        <Text color={theme.colors.warning}>y {props.confirmLabel} · Esc cancel</Text>
      </Box>
    </ModalBackdrop>
  );
}
