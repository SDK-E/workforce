# Workforce MCP plan

## Purpose

`workforce-mcp` will expose Workforce application services to two classes of MCP client:

1. **External administrator clients** — another trusted AI or operator can inspect and manage authorized companies through a local stdio server or authenticated Streamable HTTP endpoint.
2. **Workforce agent clients** — a sandboxed employee can inspect and mutate only its assigned company, identity, task, rooms, mail, artifacts, and explicitly delegated management scope.

The implementation will use the official open-source [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk), Zod schemas already used by Workforce, and thin transports. MCP handlers call application services; they never issue SQLite statements or Docker commands directly.

## Authority model

Every session resolves an immutable principal before tool discovery:

- `human-admin`: explicit company allowlist plus named administrative capabilities;
- `ceo`: one company, company-policy authority, no host or secret-store export;
- `arm`: one company, workforce-management authority;
- `manager`: one company plus managed employees/projects;
- `employee`: one company plus assigned tasks and memberships;
- `reviewer`: read evidence and submit scoped findings only.

Tool visibility is capability-filtered. Authorization is repeated inside every service call to prevent confused-deputy attacks. MCP arguments, results, errors, and principal identity are bounded, sanitized, and audited. Secret values are never MCP resources, prompts, or tool results.

## Initial resources

- `workforce://companies/{companyId}/overview`
- `workforce://companies/{companyId}/organization`
- `workforce://companies/{companyId}/strategy`
- `workforce://companies/{companyId}/tasks/{taskId}`
- `workforce://companies/{companyId}/employees/{employeeId}`
- `workforce://companies/{companyId}/attempts/{attemptId}`
- `workforce://companies/{companyId}/audit`

Resources are paginated snapshots with version/updated timestamps. Agent sessions cannot enumerate other companies.

## Initial tools

Read tools: `company_overview`, `list_tasks`, `get_task`, `list_messages`, `get_attempt`, `list_deliverables`, and `list_pending_decisions`.

Scoped work tools: `update_task_checkpoint`, `submit_claim`, `send_message`, `send_mail`, `attach_artifact_reference`, `request_approval`, `request_automation`, and `request_help`.

Management tools, visible only with authority: `create_objective`, `create_task`, `assign_task`, `decide_approval`, `propose_hire`, `transition_employment`, `configure_room`, `configure_registry`, and `emergency_stop`. Consequential tools use idempotency keys and the same confirmation/approval policies as the TUI.

## Transport and deployment

- Local external clients use stdio with an explicit configuration file and OS-level process identity.
- Remote external clients use Streamable HTTP with TLS termination, OAuth/scoped bearer authentication, origin/host validation, request limits, and session expiry.
- Agent containers receive a short-lived attempt capability token and an internal MCP endpoint through the audited Workforce network. The token binds company, employee, task, attempt, tools, expiry, and nonce.
- The host MCP server is part of the trusted control plane. It may call Workforce services but cannot execute agent-authored shell commands.

## Delivery slices

1. Add the official MCP server package, principal/capability contracts, stdio transport, read-only resources, and audit events.
2. Add scoped task/message/mail/checkpoint tools and inject the agent MCP endpoint/token only into authorized attempts.
3. Add administrative mutation tools through application services with idempotency and approval enforcement.
4. Add authenticated Streamable HTTP, revocation, rate limiting, request/result bounds, and security tests.
5. Add MCP Inspector interoperability tests, malicious-client tests, cross-company denial tests, and operator documentation.

## Acceptance

- An external admin can manage an allowed company without direct database access.
- An employee can update its own assigned task and communicate, but cannot enumerate another company, change its authority, read secrets, hire/fire, or bypass approval.
- CEO and ARM receive only their documented management tools.
- Restart, token expiry, duplicate mutation, malformed payload, oversized output, prompt injection, and transport disconnect are handled without lost audit evidence.
