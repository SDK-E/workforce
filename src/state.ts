import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { Employee, WorkforceEvent } from "./domain.js";

export class StateStore {
  readonly root: string;
  constructor(root = resolve(process.cwd(), ".workforce")) { this.root = root; }
  async initialize(): Promise<void> {
    await mkdir(resolve(this.root, "events"), { recursive: true });
    await mkdir(resolve(this.root, "organizations"), { recursive: true });
    await mkdir(resolve(this.root, "artifacts"), { recursive: true });
  }
  async append(type: string, actor: string, organizationId: string, data: Record<string, unknown>): Promise<WorkforceEvent> {
    const event: WorkforceEvent = { id: randomUUID(), at: new Date().toISOString(), type, actor, organizationId, data };
    const path = resolve(this.root, "events/events.jsonl");
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(event)}\n`, { mode: 0o600 });
    return event;
  }
  async events(): Promise<WorkforceEvent[]> {
    try {
      const raw = await readFile(resolve(this.root, "events/events.jsonl"), "utf8");
      return raw.split(/\r?\n/).filter(Boolean).flatMap((line) => { try { return [JSON.parse(line) as WorkforceEvent]; } catch { return []; } });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
  async bootstrapOrganization(id: string, name: string): Promise<Employee[]> {
    await this.initialize();
    const employees: Employee[] = [
      { id: "ceo", name: "Chief Executive", title: "CEO", department: "executive", manager: null, status: "active", responsibilities: ["Own objectives, authority, priorities, and executive decisions"], capabilityTags: ["strategy", "delegation", "approval"], hiredAt: new Date().toISOString() },
      { id: "arm", name: "Agent Resources Manager", title: "Agent Resources Manager", department: "people-operations", manager: "ceo", status: "active", responsibilities: ["Plan capacity", "Adapt roles to jobs", "Hire probationary agents", "Evaluate evidence", "Suspend unsafe agents", "Preserve offboarding records"], capabilityTags: ["workforce-planning", "hiring", "performance", "governance"], hiredAt: new Date().toISOString() }
    ];
    await writeFile(resolve(this.root, "organizations", `${id}.json`), `${JSON.stringify({ id, name, employees, tasks: [] }, null, 2)}\n`, { mode: 0o600 });
    await this.append("organization.bootstrapped", "human", id, { name, employees: employees.map(({ id: employeeId, title }) => ({ id: employeeId, title })) });
    return employees;
  }
}

