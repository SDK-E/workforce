export type OrganizationUnitKind = "department" | "team" | "office" | "room";

export interface OrganizationUnit {
  id: string;
  companyId: string;
  kind: OrganizationUnitKind;
  parentId: string | null;
  name: string;
  managerId: string | null;
  status: "active" | "archived";
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationUnitInput {
  id?: string;
  companyId: string;
  kind: OrganizationUnitKind;
  parentId?: string | null;
  name: string;
  managerId?: string | null;
  data?: Record<string, unknown>;
}
