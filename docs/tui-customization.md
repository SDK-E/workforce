# TUI customization

## Keyboard configuration

All application-owned shortcuts are declared in `src/tui/keybindings.ts`. Views, overlays, help text, and status hints consume that registry through `matchesKeybinding()` and `bindingsFor()`; they must not introduce literal key comparisons.

Every physical chord belongs to one command. A command may have aliases, but two unrelated commands cannot claim the same chord. `duplicateKeybindings()` is covered by the navigation test suite and must remain empty.

The focus model is explicit:

- `Up`/`Down` or `k`/`j` moves inside the focused surface.
- `Right` or `Enter` transfers focus from navigation to content.
- `Tab`/`Shift-Tab` transfers focus between visible navigation and content.
- `Ctrl-Tab`/`Ctrl-Shift-Tab` changes navigation area.
- `Escape` returns from content to visible navigation.
- Collapsing navigation with `Ctrl-B` always transfers focus to content, so hidden navigation cannot consume input.

## Theme configuration

Theme definitions live in `src/tui/themes/`. Each file exports a `WorkforceTheme`; `src/tui/themes/index.ts` is the registry of themes available in Settings. Theme-aware components consume tokens through `useWorkforceTheme()` rather than embedding terminal colors.

To add a theme:

1. Add a new theme file implementing `WorkforceTheme`.
2. Add it to `THEMES` in `src/tui/themes/index.ts`.
3. Start Workforce and open **System → Settings** to verify it appears.
4. Test normal, compact, modal, warning, failure, and no-color rendering.

Use `WORKFORCE_THEME=<theme-id>` to select the startup theme. In Settings, press `t` to cycle through registered themes for the current session.
