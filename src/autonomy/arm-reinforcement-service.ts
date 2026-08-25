import type { Employee } from "../domain.js";
import type { PerformanceRecord } from "../governance/performance-repository.js";
import type { StateStore } from "../storage/state-store.js";
import { classifyWorkforceFailure } from "./arm-failure-classifier.js";

const REVIEW_DAYS = 7;

export class ArmReinforcementService {
  constructor(private readonly store: StateStore) {}

  evaluateCompany(companyId: string): void {
    this.classifyFailures(companyId);
    this.applyApprovedOffboarding(companyId);
    for (const employee of this.store
      .employees(companyId)
      .filter(({ id }) => !["ceo", "arm"].includes(id)))
      this.evaluateEmployee(companyId, employee);
  }

  private classifyFailures(companyId: string): void {
    for (const attempt of this.store.attempts
      .list(companyId, 200)
      .filter(({ status }) => ["failed", "timed-out", "infrastructure-blocked"].includes(status))) {
      const category = classifyWorkforceFailure(attempt);
      this.store.workforceAdaptation.recordDecision({
        companyId,
        action: `classify-${category}`,
        subjectType: "attempt",
        subjectId: attempt.employeeId,
        referenceId: attempt.id,
        rationale: attempt.failureReason ?? `Attempt ended as ${attempt.status}`,
        evidenceIds: [attempt.id],
      });
    }
  }

  private evaluateEmployee(companyId: string, employee: Employee): void {
    const records = this.store.performance.listPerformance(companyId, employee.id);
    const negative = records.filter(({ kind }) => ["warning", "challenge"].includes(kind));
    const activePlan = this.store.workforceAdaptation.activePlan(companyId, employee.id);
    if (activePlan) {
      const recognition = records.find(
        ({ kind, createdAt }) => kind === "recognition" && createdAt > activePlan.createdAt,
      );
      if (recognition) {
        this.store.workforceAdaptation.setPlanStatus(companyId, activePlan.id, "succeeded", "arm");
        if (["coaching", "restricted"].includes(employee.status))
          this.store.employment.transition(
            companyId,
            employee.id,
            "ACTIVATE",
            "arm",
            "Reinforcement criteria met with new evidence",
          );
        return;
      }
      const newNegative = negative.filter(({ createdAt }) => createdAt > activePlan.createdAt);
      if (newNegative.length >= 2)
        this.escalateFailedPlan(companyId, employee, activePlan.id, newNegative);
      return;
    }
    if (employee.status === "restricted") {
      this.requestOffboarding(companyId, employee, negative);
      return;
    }
    if (negative.length === 0 || !["active", "probation"].includes(employee.status)) return;
    const evidenceIds = evidence(negative);
    const plan = this.store.workforceAdaptation.createPlan({
      companyId,
      employeeId: employee.id,
      rationale: "Evidence indicates a correctable performance gap; reinforce before replacement",
      criteria: [
        "Produce an independently accepted assigned deliverable",
        "No repeated evidence-backed warning during the review period",
        "Manager records recognition or successful review evidence",
      ],
      evidenceIds,
      createdBy: "arm",
      reviewAt: new Date(Date.now() + REVIEW_DAYS * 86_400_000).toISOString(),
    });
    if (employee.status === "active")
      this.store.employment.transition(
        companyId,
        employee.id,
        "COACH",
        "arm",
        `Measurable reinforcement plan ${plan.id}`,
      );
    this.store.workforceAdaptation.recordDecision({
      companyId,
      action: "reinforce",
      subjectType: "employee",
      subjectId: employee.id,
      referenceId: plan.id,
      rationale: plan.rationale,
      evidenceIds,
    });
  }

  private escalateFailedPlan(
    companyId: string,
    employee: Employee,
    planId: string,
    records: PerformanceRecord[],
  ): void {
    const evidenceIds = evidence(records);
    this.store.workforceAdaptation.setPlanStatus(companyId, planId, "failed", "arm");
    const existing = this.store.incidents
      .listCorrective(companyId)
      .find(
        ({ employeeId, status }) =>
          employeeId === employee.id && !["resolved", "archived"].includes(status),
      );
    const corrective =
      existing ??
      this.store.incidents.draftCorrective({
        companyId,
        employeeId: employee.id,
        kind: "warning",
        rationale: "Repeated evidence after measurable reinforcement requires restricted duties",
        evidenceIds,
        issuedBy: "arm",
      });
    if (corrective.status === "drafted")
      this.store.incidents.transitionCorrective(companyId, corrective.id, "ISSUE", "arm");
    if (["active", "probation", "coaching"].includes(employee.status))
      this.store.employment.transition(
        companyId,
        employee.id,
        "RESTRICT",
        "arm",
        `Reinforcement plan ${planId} failed with repeated evidence`,
      );
    this.store.workforceAdaptation.recordDecision({
      companyId,
      action: "restrict-after-reinforcement",
      subjectType: "employee",
      subjectId: employee.id,
      referenceId: planId,
      rationale: "Repeated verified issues remained after reinforcement",
      evidenceIds,
    });
  }

  private requestOffboarding(
    companyId: string,
    employee: Employee,
    negative: PerformanceRecord[],
  ): void {
    const failed = this.store.workforceAdaptation
      .plans(companyId)
      .find(({ employeeId, status }) => employeeId === employee.id && status === "failed");
    if (!failed || negative.length < 3) return;
    const existing = this.store.approvalsRepository
      .list(companyId)
      .find(
        ({ subjectType, subjectId, status }) =>
          subjectType === "employment-termination" &&
          subjectId === employee.id &&
          status !== "rejected",
      );
    if (existing) return;
    const company = this.store.companiesRepository.require(companyId);
    if (hasAuthority(company.policies, "workforce-termination")) {
      this.terminate(companyId, employee.id, failed.id, evidence(negative));
      return;
    }
    const approvalId = this.store.approvalsRepository.request(
      companyId,
      "employment-termination",
      employee.id,
      "arm",
      "Repeated verified issues remained after reinforcement and restriction",
    );
    this.store.workforceAdaptation.recordDecision({
      companyId,
      action: "request-offboarding",
      subjectType: "employee",
      subjectId: employee.id,
      referenceId: approvalId,
      rationale: "Termination requires company governance authority",
      evidenceIds: evidence(negative),
    });
  }

  private applyApprovedOffboarding(companyId: string): void {
    for (const approval of this.store.approvalsRepository
      .list(companyId, "approved")
      .filter(({ subjectType }) => subjectType === "employment-termination")) {
      const employee = this.store.employees(companyId).find(({ id }) => id === approval.subjectId);
      if (!employee || ["terminated", "archived"].includes(employee.status)) continue;
      this.terminate(companyId, employee.id, approval.id, [approval.id]);
    }
  }

  private terminate(
    companyId: string,
    employeeId: string,
    referenceId: string,
    evidenceIds: string[],
  ): void {
    try {
      this.store.employment.transition(
        companyId,
        employeeId,
        "TERMINATE",
        "arm",
        "Evidence-backed offboarding after reinforcement and governance",
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("active employee attempts"))
        throw error;
      this.store.workforceAdaptation.recordDecision({
        companyId,
        action: "await-active-attempt-stop",
        subjectType: "employee",
        subjectId: employeeId,
        referenceId,
        rationale: "Offboarding is approved but the active attempt must stop before transition",
        evidenceIds,
      });
      return;
    }
    this.store.workforceAdaptation.recordDecision({
      companyId,
      action: "offboard",
      subjectType: "employee",
      subjectId: employeeId,
      referenceId,
      rationale: "Open work was released and durable employment records were preserved",
      evidenceIds,
    });
  }
}

function evidence(records: PerformanceRecord[]): string[] {
  return [...new Set(records.flatMap(({ id, evidenceIds }) => [id, ...evidenceIds]))];
}

function hasAuthority(policies: Record<string, unknown>, authority: string): boolean {
  const autonomy = policies.autonomy;
  if (!autonomy || typeof autonomy !== "object" || Array.isArray(autonomy)) return false;
  const authorities = (autonomy as Record<string, unknown>).authorities;
  return Array.isArray(authorities) && authorities.includes(authority);
}
