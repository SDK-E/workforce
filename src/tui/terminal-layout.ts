export interface TerminalLayout {
  width: number;
  height: number;
  compact: boolean;
  sidebarAllowed: boolean;
}

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 30;
const COMPACT_WIDTH = 88;
const SIDEBAR_MINIMUM_WIDTH = 64;

export function terminalLayout(
  columns: number | undefined,
  rows: number | undefined,
): TerminalLayout {
  const width = positiveInteger(columns, DEFAULT_WIDTH);
  const height = positiveInteger(rows, DEFAULT_HEIGHT);
  return {
    width,
    height,
    compact: width < COMPACT_WIDTH,
    sidebarAllowed: width >= SIDEBAR_MINIMUM_WIDTH,
  };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}
