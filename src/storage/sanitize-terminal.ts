const UNSAFE_TERMINAL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u001B]/g;

export function sanitizeTerminal(value: string, maximumLength = 20_000): string {
  return value.replace(UNSAFE_TERMINAL_CHARACTERS, "").slice(0, maximumLength);
}
