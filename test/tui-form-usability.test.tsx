import assert from "node:assert/strict";
import test from "node:test";
import { Box } from "ink";
import { render } from "ink-testing-library";
import type { Employee } from "../src/domain.js";
import { BusinessForm } from "../src/tui/overlays/business-form.js";
import { GovernanceForm } from "../src/tui/overlays/governance-form.js";
import { MeetingForm } from "../src/tui/overlays/meeting-form.js";
import { OrganizationForm } from "../src/tui/overlays/organization-form.js";
import { ProjectIntegrationForm } from "../src/tui/overlays/project-integration-form.js";

const employees: Employee[] = [
  {
    id: "ceo",
    name: "Avery Morgan",
    title: "Chief Executive Officer",
    role: "executive",
    department: "Executive",
    manager: null,
    status: "active",
    responsibilities: [],
    capabilityTags: [],
    hiredAt: "2026-08-25T00:00:00.000Z",
  },
];
const noop = (): undefined => undefined;

test("relationship forms display company names instead of requesting opaque IDs", async () => {
  const governance = render(
    <Box width={100} height={30}>
      <GovernanceForm
        kind="recognition"
        employees={employees}
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  assert.match(governance.lastFrame() ?? "", /Avery Morgan/);
  assert.doesNotMatch(governance.lastFrame() ?? "", /Employee ID/);
  governance.unmount();

  const business = render(
    <Box width={100} height={30}>
      <BusinessForm
        kind="lead"
        opportunities={[
          {
            id: "opaque-opportunity-id",
            companyId: "acme",
            name: "Accessible analytics",
            source: "research",
            problem: "Reporting",
            hypothesis: "Automate it",
            score: 80,
            stage: "validated",
            discoveredBy: "ceo",
            ownerId: "ceo",
            evidenceIds: [],
            createdAt: "2026-08-25T00:00:00.000Z",
            updatedAt: "2026-08-25T00:00:00.000Z",
          },
        ]}
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  assert.match(business.lastFrame() ?? "", /Accessible analytics/);
  assert.doesNotMatch(business.lastFrame() ?? "", /opaque-opportunity-id/);
  business.unmount();

  const organization = render(
    <Box width={100} height={30}>
      <OrganizationForm
        companyId="acme"
        kind="team"
        employees={employees}
        units={[
          {
            id: "opaque-department-id",
            companyId: "acme",
            kind: "department",
            parentId: null,
            name: "Engineering",
            managerId: "ceo",
            status: "active",
            data: {},
            createdAt: "2026-08-25T00:00:00.000Z",
            updatedAt: "2026-08-25T00:00:00.000Z",
          },
        ]}
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  organization.stdin.write("Platform");
  await settle();
  organization.stdin.write("\r");
  await settle();
  assert.match(organization.lastFrame() ?? "", /Engineering/);
  assert.doesNotMatch(organization.lastFrame() ?? "", /opaque-department-id/);
  organization.unmount();
});

test("meeting and project integration forms select named scoped records", async () => {
  const meeting = render(
    <Box width={100} height={30}>
      <MeetingForm employees={employees} terminalWidth={100} onSubmit={noop} onCancel={noop} />
    </Box>,
  );
  meeting.stdin.write("Roadmap review");
  await settle();
  meeting.stdin.write("\r");
  await settle();
  assert.match(meeting.lastFrame() ?? "", /Avery Morgan/);
  assert.doesNotMatch(meeting.lastFrame() ?? "", /Organizer ID/);
  meeting.unmount();

  const integration = render(
    <Box width={100} height={30}>
      <ProjectIntegrationForm
        companyId="acme"
        projects={[
          {
            id: "opaque-project-id",
            companyId: "acme",
            kind: "project",
            parentId: "initiative",
            name: "Customer portal",
            ownerId: "ceo",
            managerId: "ceo",
            status: "active",
            requirements: [],
            constraints: [],
            successMeasures: ["Released"],
            dependencies: [],
            risks: [],
            evidence: [],
            targetAt: null,
            createdAt: "2026-08-25T00:00:00.000Z",
            updatedAt: "2026-08-25T00:00:00.000Z",
          },
        ]}
        terminalWidth={100}
        onSubmit={noop}
        onCancel={noop}
      />
    </Box>,
  );
  assert.match(integration.lastFrame() ?? "", /Customer portal/);
  assert.doesNotMatch(integration.lastFrame() ?? "", /opaque-project-id/);
  integration.unmount();
});

async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 75);
  });
}
