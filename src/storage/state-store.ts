import type { DatabaseSync } from "node:sqlite";
import type { Employee, WorkforceEvent } from "../domain.js";
import { ApprovalRepository } from "./approval-repository.js";
import { AuditRepository } from "./audit-repository.js";
import { CompanyRepository } from "./company-repository.js";
import { ConversationRepository } from "./conversation-repository.js";
import { WorkforceDatabase } from "./database.js";
import { EntityRepository } from "./entity-repository.js";
import { TaskRepository } from "./task-repository.js";
import type { CreateTaskInput, TaskEvent, TaskRecord, TaskStatus } from "../tasks/task-types.js";
import type { CompanyRecord, CreateCompanyInput, EntityRecord, MessageRecord } from "./records.js";

/** Composition facade used by the application while feature services are introduced. */
export class StateStore {
  readonly database: WorkforceDatabase;
  readonly audit: AuditRepository;
  readonly companiesRepository: CompanyRepository;
  readonly entitiesRepository: EntityRepository;
  readonly conversationsRepository: ConversationRepository;
  readonly approvalsRepository: ApprovalRepository;
  readonly tasksRepository: TaskRepository;

  constructor(root?: string) {
    this.database = new WorkforceDatabase(root);
    this.audit = new AuditRepository(this.database);
    this.companiesRepository = new CompanyRepository(this.database, this.audit);
    this.entitiesRepository = new EntityRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.conversationsRepository = new ConversationRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.approvalsRepository = new ApprovalRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.tasksRepository = new TaskRepository(this.database, this.companiesRepository, this.audit);
  }

  get root(): string {
    return this.database.root;
  }
  get path(): string {
    return this.database.path;
  }
  get db(): DatabaseSync {
    return this.database.connection;
  }
  initialize(): void {
    this.database.initialize();
  }
  close(): void {
    this.database.close();
  }
  transaction<T>(operation: () => T): T {
    return this.database.transaction(operation);
  }
  createCompany(input: CreateCompanyInput): CompanyRecord {
    return this.companiesRepository.create(input);
  }
  company(id: string): CompanyRecord | undefined {
    return this.companiesRepository.get(id);
  }
  companies(): CompanyRecord[] {
    return this.companiesRepository.list();
  }
  employees(companyId: string): Employee[] {
    return this.companiesRepository.employees(companyId);
  }
  bootstrapOrganization(id: string, name: string): Employee[] {
    if (!this.company(id)) this.createCompany({ id, name });
    return this.employees(id);
  }
  createEntity(
    companyId: string,
    kind: string,
    name: string,
    data: Record<string, unknown> = {},
    parentId: string | null = null,
  ): EntityRecord {
    return this.entitiesRepository.create(companyId, kind, name, data, parentId);
  }
  entities(companyId: string, kind?: string, limit = 100): EntityRecord[] {
    return this.entitiesRepository.list(companyId, kind, limit);
  }
  addMessage(
    companyId: string,
    roomId: string,
    authorId: string,
    body: string,
    threadId: string | null = null,
  ): MessageRecord {
    return this.conversationsRepository.addMessage(companyId, roomId, authorId, body, threadId);
  }
  messages(companyId: string, roomId: string, limit = 100): MessageRecord[] {
    return this.conversationsRepository.messages(companyId, roomId, limit);
  }
  requestApproval(
    companyId: string,
    subjectType: string,
    subjectId: string,
    requestedBy: string,
  ): string {
    return this.approvalsRepository.request(companyId, subjectType, subjectId, requestedBy);
  }
  pendingApprovals(companyId: string): number {
    return this.approvalsRepository.pendingCount(companyId);
  }
  createTask(input: CreateTaskInput): TaskRecord {
    return this.tasksRepository.create(input);
  }
  tasks(companyId: string, status?: TaskStatus, limit = 100): TaskRecord[] {
    return this.tasksRepository.list(companyId, status, limit);
  }
  transitionTask(
    companyId: string,
    taskId: string,
    event: TaskEvent,
    actorId: string,
    rationale: string,
    acceptanceApproved = false,
  ): TaskRecord {
    return this.tasksRepository.transition(
      companyId,
      taskId,
      event,
      actorId,
      rationale,
      acceptanceApproved,
    );
  }
  eventCount(companyId: string): number {
    return this.audit.count(companyId);
  }
  append(
    type: string,
    actor: string,
    companyId: string,
    data: Record<string, unknown>,
  ): WorkforceEvent {
    return this.audit.append(type, actor, companyId, data);
  }
  events(companyId?: string, limit = 500): WorkforceEvent[] {
    return this.audit.list(companyId, limit);
  }
  verifyAuditChain(): boolean {
    return this.audit.verifyChain();
  }
  backup(target: string): void {
    this.database.backup(target);
  }
}
