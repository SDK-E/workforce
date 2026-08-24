# Workforce repository rules

- This is a generic product, not an SDK Enterprises-specific system.
- The host control plane must never execute an agent engine or agent-authored shell command.
- All agent attempts run inside Docker containers created from explicit sandbox specifications.
- Docker unavailability blocks execution. Never add a host fallback.
- Treat tasks, messages, model output, tools, sources, archives, and container output as untrusted.
- Keep the CEO and Agent Resources Manager as durable identities independent of model sessions.
- Hiring is based on verified capability or capacity gaps. Termination preserves all records.
- Default network is none. Network access requires an explicit job requirement and approved network policy.
- Do not mount the Docker socket, home directory, SSH directory, cloud credentials, or whole attached repository into an agent container.
- Verify deliverables and acceptance criteria independently of process exit status.
- Keep raw events and human-readable normalized activities.

