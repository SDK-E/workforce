# Repository map

Workforce is organized by product capability. Put new domain behavior beside the feature that owns it; reserve shared infrastructure folders for code that genuinely serves several features.

## Top level

| Path | Responsibility |
| --- | --- |
| `src/` | TypeScript control plane and TUI |
| `src/storage/migrations/` | One forward-only SQL migration per version plus migration metadata |
| `docker/` | Universal Alpine agent image, trusted control-plane image, and audited egress image |
| `scripts/` | Build, verification, and operational entry points |
| `test/` | Unit, integration, TUI, and sandbox contract tests |
| `docs/` | Current product, architecture, operations, and contribution guidance |

## Source capabilities

| Path | Responsibility |
| --- | --- |
| `acceptance/` | Artifact collection and independent acceptance evaluation |
| `automations/` | Governed recurring-work proposals and executions |
| `business/` | Opportunity, lead, client, and engagement pipeline records |
| `autonomy/` | Durable CEO and ARM operating loops |
| `conversations/` | Rooms, threads, messages, and attachments |
| `employees/` | Agent identity, persona, prompt, and capability profiles |
| `engines/` | Container engine adapters, failover, and circuit breaking |
| `governance/` | Employment, meetings, incidents, and performance lifecycles |
| `integrations/` | MCP, mail, and project integration policies |
| `organizations/` | Departments, teams, offices, rooms, and their repository |
| `registries/` | Models, tools, and execution environments |
| `runtime/` | Persistent daemon composition and authenticated TUI control API |
| `secrets/` | Encrypted, scoped credential storage and attempt injection |
| `storage/` | Database lifecycle and cross-cutting persistence primitives only |
| `strategy/` | Objectives, initiatives, projects, goals, and milestones |
| `supervision/` | Docker attempts, leases, capacity, recovery, and logs |
| `tasks/` | Task lifecycle, requirements, persistence, and execution service |
| `tui/` | Terminal shell, organized into `components/`, `overlays/`, and `views/` |
| `tui/themes/` | Discoverable theme definitions and the runtime theme registry |

## Placement rules

- Keep one primary class or React view per file.
- Keep feature repositories in their owning capability folder, not in `storage/`.
- Keep SQL out of TypeScript migrations; add the next `src/storage/migrations/NNN.sql` file and let `schema_migrations` record the applied version.
- Delete superseded files and update this map in the same change that replaces them.
- A module over 300 lines fails lint and should be split by responsibility.
- Declare application shortcuts only in `tui/keybindings.ts`; duplicate chords fail tests.
- Consume colors from a registered `WorkforceTheme`, not literal component colors.
- The host control plane coordinates work but never runs agent-authored commands or agent engines.
