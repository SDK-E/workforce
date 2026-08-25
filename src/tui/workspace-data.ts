import type { StateStore } from "../storage/state-store.js";

export function loadWorkspaceData(store: StateStore, companyId: string) {
  const rooms = store.conversations.roomList(companyId);
  const primaryRoom = rooms[0];
  return {
    employees: store.employees(companyId),
    pendingApprovals: store.pendingApprovals(companyId),
    organizationUnits: store.organizationUnits(companyId),
    strategyItems: store.strategyItems(companyId),
    tasks: store.tasks(companyId),
    messages: primaryRoom ? store.messages(companyId, primaryRoom.id) : [],
    rooms,
    threads: primaryRoom ? store.conversations.threads.list(companyId, primaryRoom.id) : [],
    hiringProposals: store.employment.proposalList(companyId),
    approvals: store.approvalsRepository.list(companyId),
    meetings: store.meetings.list(companyId),
    performanceRecords: store.performance.listPerformance(companyId),
    incidents: store.incidents.listIncidents(companyId),
    correctiveActions: store.incidents.listCorrective(companyId),
    claims: store.performance.listClaims(companyId),
    attempts: store.attempts.list(companyId),
    artifacts: store.artifacts.listCompany(companyId),
    events: store.events(companyId, 200),
    tools: store.tools.list(companyId),
    environments: store.environments.list(companyId),
    models: store.models.list(companyId),
    agentProfiles: store.agentProfiles.list(companyId),
    mcpServers: store.mcpServers.list(companyId),
    projectIntegrations: store.projectIntegrations.list(companyId),
    mail: store.mail.listCompany(companyId),
    automations: store.automations.list(companyId),
    runtime: store.autonomy.get(companyId),
    companies: store.companies(),
  };
}

export type WorkspaceData = ReturnType<typeof loadWorkspaceData>;
