import { createContext, useContext, type ReactNode } from "react";
import type { WorkforceTheme } from "./theme.js";
import { DEFAULT_THEME } from "./index.js";

const ThemeContext = createContext<WorkforceTheme>(DEFAULT_THEME);

export function WorkforceThemeProvider({
  theme,
  children,
}: {
  theme: WorkforceTheme;
  children: ReactNode;
}) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useWorkforceTheme(): WorkforceTheme {
  return useContext(ThemeContext);
}
