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
