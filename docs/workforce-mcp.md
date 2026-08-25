# Workforce MCP plan

## Purpose

`workforce-mcp` exposes Workforce application services to two classes of MCP client:

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

1. **Complete:** the official MCP server package, immutable principal/capability contracts, stdio transport, overview/organization/strategy resources, read tools, response bounds, capability-filtered discovery, relationship scoping, and company-isolation tests are implemented.
2. **Complete:** agents can list joined rooms, read/send room messages, read/send internal mail, list and contribute to their meetings, and record checkpoints only on assigned tasks. These calls are separately MCP-audited. Claims, artifact submission, approvals, automation requests, and help/handoff tools remain.
3. **Complete:** Docker attempts declare ephemeral secrets separately from encrypted persistent secrets. When `WORKFORCE_MCP_URL` is configured, the control plane injects that non-secret endpoint plus an HMAC-signed `WORKFORCE_MCP_TOKEN` through Docker's process environment. The token binds the company, employee, task, attempt, role grants, issue/expiry time, and nonce; it is never stored or placed in command arguments, is replaced on reissue, and is revoked when the attempt ends. Tampering, expiry, revocation, attempt mismatch, company mismatch, and role grants are tested.
4. Add administrative mutation tools through application services with idempotency and approval enforcement.
5. Add the authenticated internal Streamable HTTP transport, rate limiting, request/result bounds, and security tests. Token issuance is present, but containers cannot use Workforce MCP until this transport is running at the configured endpoint.
6. Add MCP Inspector interoperability tests, malicious-client tests, cross-company denial tests, and operator documentation.

## Local stdio usage

Create a protected JSON configuration whose `principal` declares an ID, role, explicit company IDs, optional employee ID, and capabilities. It may also declare `stateRoot`; omission uses the normal Workforce state location. Secret values never belong in this file.

```json
{
  "principal": {
    "id": "local-admin",
    "role": "human-admin",
    "companyIds": ["my-company"],
    "employeeId": null,
    "capabilities": ["company:read", "task:read", "message:read", "message:write"]
  }
}
```

Configure the MCP client command as `pnpm workforce:mcp -- /absolute/path/to/config.json`. Tool arguments are validated, authorization is repeated inside the query service, and every successful read is added to the company audit chain.

Tool discovery is capability filtered. Relationship policy then narrows records further: ordinary employees see assigned tasks and joined rooms, reviewers see reviewed tasks, managers see managed work, and meeting participation is limited to organizers and participants. Attempts never expose command/environment data, deliverables never expose host storage paths, responses are capped at 100 KB, and secret values are never returned.

## Acceptance

- An external admin can manage an allowed company without direct database access.
- An employee can update its own assigned task and communicate, but cannot enumerate another company, change its authority, read secrets, hire/fire, or bypass approval.
- CEO and ARM receive only their documented management tools.
- Restart, token expiry, duplicate mutation, malformed payload, oversized output, prompt injection, and transport disconnect are handled without lost audit evidence.
