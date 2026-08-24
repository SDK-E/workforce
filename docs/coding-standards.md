# Coding standards

## Module boundaries

- Keep executable entrypoints thin. They may assemble dependencies, but contain no view or domain logic.
- Put TUI shell components in `src/tui/components`, modal UI in `src/tui/overlays`, and page-level UI in `src/tui/views`.
- Put database schema and migrations in `src/storage/schema.ts`, persisted record types in `src/storage/records.ts`, and storage behavior in dedicated store or repository files.
- Put domain policies in their named feature directory, independent of the TUI and storage implementation.
- A class has its own file. Do not define unrelated classes in the same module.
- Compatibility entrypoints such as `src/state.ts` may only re-export public APIs.

## Dependency direction

Entrypoints and views may depend on application and domain APIs. Domain policy must not import Ink, SQLite, Docker, or CLI modules. Storage and runtime adapters implement infrastructure behavior and must not contain presentation logic.

## Readability and enforcement

- Use descriptive names and explicit interfaces at module boundaries.
- Do not compress declarations or control flow onto one line.
- Keep SQL readable and parameterized.
- Explain security or reliability constraints, not obvious syntax.
- Run `pnpm format` before committing.
- `pnpm test` enforces `pnpm format:check` before compiling and testing.

## Compatibility

When moving a public module, retain a small re-export facade until all consumers migrate. Never duplicate the underlying implementation to preserve an old import.

## Open-source reuse

Evaluate maintained packages before implementing generic infrastructure. Record decisions in [package-decisions.md](package-decisions.md). Workforce policy remains local domain code; generic state machines, logging, process control, and terminal inputs should use reviewed packages.
