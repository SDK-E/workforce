export interface CompanyRecord {
  id: string;
  name: string;
  displayName: string;
  mission: string;
  vision: string;
  values: string[];
  policies: Record<string, unknown>;
  budgetCents: number;
  createdAt: string;
}

export interface CreateCompanyInput {
  id?: string;
  name: string;
  displayName?: string;
  mission?: string;
  vision?: string;
  values?: string[];
  policies?: Record<string, unknown>;
  budgetCents?: number;
}

export interface UpdateCompanyInput {
  companyId: string;
  name?: string;
  displayName?: string;
  mission?: string;
  vision?: string;
  values?: string[];
  policies?: Record<string, unknown>;
  budgetCents?: number;
}

export interface EntityRecord {
  id: string;
  companyId: string;
  kind: string;
  parentId: string | null;
  name: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  companyId: string;
  roomId: string;
  threadId: string | null;
  authorId: string;
  body: string;
  createdAt: string;
  pinned: boolean;
}
