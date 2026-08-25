import type { DatabaseSync } from "node:sqlite";
import type { Employee, WorkforceEvent } from "../domain.js";
import { ApprovalRepository } from "./approval-repository.js";
import { AuditRepository } from "./audit-repository.js";
import { CompanyRepository } from "./company-repository.js";
import { ConversationService } from "../conversations/conversation-service.js";
import { WorkforceDatabase } from "./database.js";
import { TaskRepository } from "../tasks/task-repository.js";
import { OrganizationRepository } from "../organizations/organization-repository.js";
import { StrategyRepository } from "../strategy/strategy-repository.js";
import type {
  CreateOrganizationUnitInput,
  OrganizationUnit,
  OrganizationUnitKind,
} from "../organizations/organization-types.js";
import type {
  CreateStrategyItemInput,
  StrategyItem,
  StrategyItemKind,
} from "../strategy/strategy-types.js";
import type { CreateTaskInput, TaskEvent, TaskRecord, TaskStatus } from "../tasks/task-types.js";
import type { CompanyRecord, CreateCompanyInput, UpdateCompanyInput } from "./records.js";
import type { MessageRecord } from "../conversations/conversation-types.js";
import { EmploymentRepository } from "../governance/employment-repository.js";
import { MeetingRepository } from "../governance/meeting-repository.js";
import { MeetingContributionRepository } from "../governance/meeting-contribution-repository.js";
import { IncidentRepository } from "../governance/incident-repository.js";
import { PerformanceRepository } from "../governance/performance-repository.js";
import { AttemptRepository } from "../supervision/attempt-repository.js";
import { ArtifactRepository } from "./artifact-repository.js";
import { ExecutionEvidenceRepository } from "./execution-evidence-repository.js";
import { ToolRepository } from "../registries/tool-repository.js";
import { EnvironmentRepository } from "../registries/environment-repository.js";
import { ModelRepository } from "../registries/model-repository.js";
import { DefaultRegistries } from "../registries/default-registries.js";
import { AgentProfileRepository } from "../employees/agent-profile-repository.js";
import { DefaultAgentProfiles } from "../employees/default-agent-profiles.js";
import { AttemptFactory } from "../supervision/attempt-factory.js";
import { AutomationRepository } from "../automations/automation-repository.js";
import { AutonomyRepository } from "../autonomy/autonomy-repository.js";
import { McpServerRepository } from "../integrations/mcp-server-repository.js";
import { ProjectIntegrationRepository } from "../integrations/project-integration-repository.js";
import { MailRepository } from "../integrations/mail-repository.js";
import { TaskCheckpointRepository } from "../tasks/task-checkpoint-repository.js";
import { TaskHandoffRepository } from "../tasks/task-handoff-repository.js";
import { ArtifactReferenceRepository } from "./artifact-reference-repository.js";

/** Composition facade used by the application while feature services are introduced. */
export class StateStore {
  readonly database: WorkforceDatabase;
  readonly audit: AuditRepository;
  readonly companiesRepository: CompanyRepository;
  readonly conversations: ConversationService;
  readonly approvalsRepository: ApprovalRepository;
  readonly tasksRepository: TaskRepository;
  readonly organizationRepository: OrganizationRepository;
  readonly strategyRepository: StrategyRepository;
  readonly employment: EmploymentRepository;
  readonly meetings: MeetingRepository;
  readonly meetingContributions: MeetingContributionRepository;
  readonly incidents: IncidentRepository;
  readonly performance: PerformanceRepository;
  readonly attempts: AttemptRepository;
  readonly artifacts: ArtifactRepository;
  readonly executionEvidence: ExecutionEvidenceRepository;
  readonly tools: ToolRepository;
  readonly environments: EnvironmentRepository;
  readonly models: ModelRepository;
  readonly defaultRegistries: DefaultRegistries;
  readonly agentProfiles: AgentProfileRepository;
  readonly defaultAgentProfiles: DefaultAgentProfiles;
  readonly attemptFactory: AttemptFactory;
  readonly automations: AutomationRepository;
  readonly autonomy: AutonomyRepository;
  readonly mcpServers: McpServerRepository;
  readonly projectIntegrations: ProjectIntegrationRepository;
  readonly mail: MailRepository;
  readonly taskCheckpoints: TaskCheckpointRepository;
  readonly taskHandoffs: TaskHandoffRepository;
  readonly artifactReferences: ArtifactReferenceRepository;

  constructor(root?: string) {
    this.database = new WorkforceDatabase(root);
    this.audit = new AuditRepository(this.database);
    this.companiesRepository = new CompanyRepository(this.database, this.audit);
    this.conversations = new ConversationService(
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
    this.taskCheckpoints = new TaskCheckpointRepository(this.database, this.audit);
    this.taskHandoffs = new TaskHandoffRepository(this.database, this.audit);
    this.artifactReferences = new ArtifactReferenceRepository(this.database, this.audit);
    this.organizationRepository = new OrganizationRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.strategyRepository = new StrategyRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.agentProfiles = new AgentProfileRepository(this.database, this.audit);
    this.defaultAgentProfiles = new DefaultAgentProfiles(this.agentProfiles);
    this.attemptFactory = new AttemptFactory(this.agentProfiles);
    this.employment = new EmploymentRepository(
      this.database,
      this.companiesRepository,
      this.audit,
      (companyId, blueprint, actorId) => {
        this.defaultAgentProfiles.fromBlueprint(companyId, blueprint, actorId);
      },
    );
    this.meetings = new MeetingRepository(this.database, this.companiesRepository, this.audit);
    this.meetingContributions = new MeetingContributionRepository(this.database, this.audit);
    this.incidents = new IncidentRepository(this.database, this.companiesRepository, this.audit);
    this.performance = new PerformanceRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.attempts = new AttemptRepository(this.database, this.audit);
    this.artifacts = new ArtifactRepository(this.database);
    this.executionEvidence = new ExecutionEvidenceRepository(this.database);
    this.tools = new ToolRepository(this.database, this.companiesRepository, this.audit);
    this.environments = new EnvironmentRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.models = new ModelRepository(this.database, this.companiesRepository, this.audit);
    this.defaultRegistries = new DefaultRegistries(this.tools, this.environments, this.models);
    this.automations = new AutomationRepository(
      this.database,
      this.companiesRepository,
      this.audit,
    );
    this.autonomy = new AutonomyRepository(this.database, this.audit);
    this.mcpServers = new McpServerRepository(this.database, this.companiesRepository, this.audit);
    this.projectIntegrations = new ProjectIntegrationRepository(this.database, this.audit);
    this.mail = new MailRepository(this.database, this.audit);
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
    for (const company of this.companies()) this.autonomy.ensure(company.id);
    for (const company of this.companies()) this.defaultRegistries.ensure(company.id);
    for (const company of this.companies())
      this.defaultAgentProfiles.ensure(company.id, this.employees(company.id));
  }
  close(): void {
    this.database.close();
  }
  transaction<T>(operation: () => T): T {
    return this.database.transaction(operation);
  }
  createCompany(input: CreateCompanyInput): CompanyRecord {
    const company = this.companiesRepository.create(input);
    this.autonomy.ensure(company.id);
    this.defaultRegistries.ensure(company.id);
    this.defaultAgentProfiles.ensure(company.id, this.employees(company.id));
    return company;
  }
  updateCompany(input: UpdateCompanyInput, actorId = "human"): CompanyRecord {
    return this.companiesRepository.update(input, actorId);
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
  addMessage(
    companyId: string,
    roomId: string,
    authorId: string,
    body: string,
    threadId: string | null = null,
  ): MessageRecord {
    return this.conversations.addMessage(companyId, roomId, authorId, body, threadId);
  }
  messages(companyId: string, roomId: string, limit = 100): MessageRecord[] {
    return this.conversations.messagePage(companyId, roomId, "", limit).items;
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
  createOrganizationUnit(input: CreateOrganizationUnitInput): OrganizationUnit {
    return this.organizationRepository.create(input);
  }
  organizationUnits(companyId: string, kind?: OrganizationUnitKind): OrganizationUnit[] {
    return this.organizationRepository.list(companyId, kind);
  }
  createStrategyItem(input: CreateStrategyItemInput): StrategyItem {
    return this.strategyRepository.create(input);
  }
  strategyItems(companyId: string, kind?: StrategyItemKind): StrategyItem[] {
    return this.strategyRepository.list(companyId, kind);
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
