export type StrategyItemKind = "objective" | "initiative" | "project" | "goal" | "milestone";
export type StrategyStatus =
  | "draft"
  | "active"
  | "at-risk"
  | "blocked"
  | "completed"
  | "cancelled"
  | "archived";

export interface StrategyItem {
  id: string;
  companyId: string;
  kind: StrategyItemKind;
  parentId: string | null;
  name: string;
  ownerId: string;
  managerId: string;
  status: StrategyStatus;
  requirements: string[];
  constraints: string[];
  successMeasures: string[];
  dependencies: string[];
  risks: string[];
  evidence: string[];
  targetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyItemInput {
  id?: string;
  companyId: string;
  kind: StrategyItemKind;
  parentId?: string | null;
  name: string;
  ownerId: string;
  managerId: string;
  requirements?: string[];
  constraints?: string[];
  successMeasures: string[];
  dependencies?: string[];
  risks?: string[];
  targetAt?: string | null;
}
