import type { StateStore } from "../storage/state-store.js";

type CeoCommercialAction =
  | "establish-direction"
  | "discover-opportunities"
  | "research-opportunity"
  | "qualify-lead"
  | "acquire-client"
  | "plan-engagement"
  | "deliver-engagement"
  | "await-governance"
  | "await-configuration";

export interface CeoCommercialDecision {
  action: CeoCommercialAction;
  subjectId: string | null;
  rationale: string;
  authority: "delegated" | "approval-required" | "none";
}

export class CeoCommercialPlanner {
  constructor(private readonly store: StateStore) {}

  decide(companyId: string): CeoCommercialDecision {
    const company = this.store.companiesRepository.require(companyId);
    if (!company.mission.trim())
      return decision(
        "await-configuration",
        null,
        "A company mission is required before autonomous direction is safe",
        "none",
      );
    if (this.store.pendingApprovals(companyId) > 0)
      return decision(
        "await-governance",
        null,
        "Pending company decisions require governance before new commitments",
        "none",
      );

    const objective = this.store
      .strategyItems(companyId, "objective")
      .find(({ status }) => !["cancelled", "completed", "archived"].includes(status));
    if (!objective)
      return decision(
        "establish-direction",
        null,
        "The configured mission has no current measurable objective",
        "delegated",
      );

    const opportunities = this.store.opportunities
      .list(companyId, { limit: 200 })
      .filter(({ stage }) => !["rejected", "converted", "archived"].includes(stage));
    const validated = opportunities.find(({ stage }) => stage === "validated");
    if (validated) {
      const lead = this.store.leads
        .list(companyId, { limit: 200 })
        .find(
          ({ opportunityId, status }) =>
            opportunityId === validated.id && !["lost", "archived"].includes(status),
        );
      if (!lead)
        return decision(
          "qualify-lead",
          validated.id,
          "A validated opportunity requires evidence-backed lead qualification",
          externalAuthority(company.policies),
        );
      const client = this.store.clients
        .list(companyId, { limit: 200 })
        .find(({ leadId, status }) => leadId === lead.id && status !== "archived");
      if (!client)
        return decision(
          "acquire-client",
          lead.id,
          "A qualified lead is ready for governed acquisition work",
          externalAuthority(company.policies),
        );
      const engagement = this.store.engagements
        .list(companyId, { limit: 200 })
        .find(({ clientId, status }) => clientId === client.id && status !== "archived");
      return engagement
        ? decision(
            "deliver-engagement",
            engagement.id,
            "An existing client engagement requires accepted delivery or maintenance work",
            "delegated",
          )
        : decision(
            "plan-engagement",
            client.id,
            "An acquired client requires measurable delivery scope",
            externalAuthority(company.policies),
          );
    }
    const candidate = opportunities[0];
    return candidate
      ? decision(
          "research-opportunity",
          candidate.id,
          "An unresolved opportunity needs stronger evidence before commitment",
          "delegated",
        )
      : decision(
          "discover-opportunities",
          null,
          "The company has no active commercial opportunities",
          "delegated",
        );
  }
}

function externalAuthority(policies: Record<string, unknown>): "delegated" | "approval-required" {
  const autonomy = policies.autonomy;
  if (!autonomy || typeof autonomy !== "object" || Array.isArray(autonomy))
    return "approval-required";
  const authorities = (autonomy as Record<string, unknown>).authorities;
  return Array.isArray(authorities) && authorities.includes("external-contact")
    ? "delegated"
    : "approval-required";
}

function decision(
  action: CeoCommercialAction,
  subjectId: string | null,
  rationale: string,
  authority: CeoCommercialDecision["authority"],
): CeoCommercialDecision {
  return { action, subjectId, rationale, authority };
}
