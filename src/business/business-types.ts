export interface OpportunityRecord {
  id: string;
  companyId: string;
  name: string;
  source: string;
  problem: string;
  hypothesis: string;
  score: number;
  stage: "discovered" | "researching" | "validated" | "rejected" | "converted" | "archived";
  discoveredBy: string;
  ownerId: string | null;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadRecord {
  id: string;
  companyId: string;
  opportunityId: string | null;
  name: string;
  organization: string;
  email: string | null;
  website: string | null;
  source: string;
  qualificationScore: number;
  status: "new" | "qualified" | "contacted" | "nurturing" | "won" | "lost" | "archived";
  ownerId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRecord {
  id: string;
  companyId: string;
  leadId: string | null;
  name: string;
  primaryContact: string;
  email: string | null;
  status: "prospect" | "active" | "paused" | "former" | "archived";
  ownerId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementRecord {
  id: string;
  companyId: string;
  clientId: string;
  projectId: string | null;
  name: string;
  status: "proposed" | "active" | "paused" | "completed" | "cancelled" | "archived";
  scope: string;
  successCriteria: string[];
  ownerId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}
