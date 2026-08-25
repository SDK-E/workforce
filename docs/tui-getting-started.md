# Getting started with Workforce

This guide is for the person operating a company. It assumes Workforce has already been installed and Docker is running.

## Start Workforce

Open two terminals in the Workforce folder:

```sh
# Terminal 1: start the company engine
pnpm start

# Terminal 2: open the interface
pnpm tui
```

The engine keeps operating when the TUI is closed. `pnpm stop` stops it without deleting company data. Never use `pnpm reset` unless you intend to permanently erase every company and start over.

## Understand the screen

- The **top bar** reports Docker, running containers, queued work, decisions, and alerts.
- The **sidebar** contains areas such as Overview, Organization, Strategy & work, Business, Collaboration, Governance, Platform, and System.
- The **main panel** shows the page you selected.
- The **bottom bar** shows only the useful actions for the current page. Press `?` at any time for all keys.

Press `Tab` to move focus between the sidebar and the main panel. Arrow keys affect the focused part of the screen.
Below 64 columns Workforce hides the sidebar automatically and routes input to the content panel; widen
the terminal to restore the sidebar. Run `NO_COLOR=1 pnpm tui` when the terminal or accessibility tool
must not receive ANSI color styling. Cursor-control sequences remain necessary for an interactive TUI.

## Essential keys

| Key                 | Action                                    |
| ------------------- | ----------------------------------------- |
| `Tab` / `Shift-Tab` | Move between sidebar and main panel       |
| `Up` / `Down`       | Move within the focused area              |
| `Left` / `Right`    | Change sidebar area or main-panel tab     |
| `Enter`             | Open or confirm                           |
| `Esc`               | Close a popup or go back                  |
| `/` or `Ctrl-P`     | Find and open any page                    |
| `[` / `]`           | Select the previous or next record        |
| `n`                 | Create a record                           |
| `e`                 | Edit or decide the selected record        |
| `d` / `u`           | Archive or restore a record               |
| `r`                 | Run the selected ready task               |
| `v`                 | Verify a supported platform configuration |
| `Ctrl-B`            | Hide or show the sidebar                  |
| `Ctrl-,`            | Open settings                             |
| `?`                 | Show keyboard help                        |
| `!`                 | Emergency-stop agent execution            |
| `q`                 | Close the TUI safely                      |

Workforce asks for confirmation before consequential actions. Deleting from the TUI normally archives the record so its history remains available and it can be restored.

## Set up your first company

1. Open the command palette with `/`, search for **Companies**, and press `Enter`.
2. Press `n`, then enter only the company name and mission. Workforce generates the internal ID and creates durable CEO and ARM identities. Select the company and press `e` later when you want to add vision, values, governance, or budget settings.
3. Open **Models & engines**. Create the model configuration the agents will use, select it, and press `v` to verify it. A configured but unverified model cannot run work.
4. Open **Execution readiness**. Resolve every blocker shown there before expecting agents to start.
5. Open **Organization** to review the CEO, ARM, departments, teams, reporting structure, policies, and agent profiles.

If the overview shows CEO and ARM identities but Docker shows no containers, that is normal: identities are permanent company records; containers exist only while an assigned task is actually running.

## Give the company work

1. In **Objectives**, press `n` and describe a measurable result.
2. Optionally organize it through Initiatives, Projects, Goals, and Milestones.
3. In **Tasks**, press `n`. Give the task a clear objective, explicit acceptance criteria, and risk. Choosing an assignee is optional; leave it empty for ARM staffing. Confirmation creates an approved task because that confirmation is the human approval.
4. Select the task with `[` or `]`, then press `r` when it is assigned and ready.
5. Watch **Live work** for the real Docker attempt and its event timeline—not merely the employee identity.
6. Check **Deliverables** for validated output and **Audit** for decisions and mutations.

A successful process exit does not finish a task by itself. Workforce requires the declared deliverables and independent acceptance evidence.

## Operate the business

Use the Business area as a simple pipeline:

1. Record possible work under **Opportunities**.
2. Turn promising opportunities into qualified **Leads**.
3. Record acquired organizations under **Clients**.
4. Create an **Engagement** with delivery scope and measurable success criteria.
5. Create projects and tasks for the engagement, then monitor delivery through Live work and Deliverables.

Use `n`, `e`, `d`, and `u` consistently to create, edit, archive, and restore these records.

## Work with agents and decisions

- **Conversations**, **Mail**, and **Meetings** hold company communication.
- **Approvals** contains actions waiting for human authority.
- **Agent Resources** shows hiring and workforce proposals from the ARM.
- **Performance**, **Recognition**, and **Warnings & incidents** hold evidence-backed workforce records.
- **Automations** holds repetitive workflows proposed by agents or created by a human. Review an automation before approving it.

Keep the company mission, current strategy, reporting structure, goals, milestones, and task ownership accurate. Workforce injects that current organizational context into every agent attempt.

## When nothing runs

Open **Execution readiness** first. The usual causes are:

- Docker is stopped;
- the universal image has not been built;
- no verified model is available;
- the task is unassigned, unapproved, blocked by dependencies, or missing acceptance criteria;
- a required credential is missing or outside the task's allowed scope;
- the employee already has an active attempt;
- the emergency stop is active.

Then inspect **Live work**, **Approvals**, and **Advanced diagnostics** for the recorded reason. Workforce deliberately blocks execution instead of silently running an agent on the host.

## Stop or recover

- `pnpm status` shows whether the engine is running.
- `pnpm logs` shows engine logs.
- `pnpm stop` safely stops the engine while preserving data.
- `pnpm start` resumes with the same companies and history.
- `pnpm reset` permanently deletes the Workforce state volume; use it only for an intentional fresh start.
