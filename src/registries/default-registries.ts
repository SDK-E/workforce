import type { EnvironmentRepository } from "./environment-repository.js";
import type { ModelRepository } from "./model-repository.js";
import type { ToolRepository } from "./tool-repository.js";

export class DefaultRegistries {
  constructor(
    private readonly tools: ToolRepository,
    private readonly environments: EnvironmentRepository,
    private readonly models: ModelRepository,
  ) {}

  ensure(companyId: string): void {
    if (this.tools.list(companyId, "", 1).length === 0) this.seedTools(companyId);
    if (this.environments.list(companyId, 1).length === 0) this.seedEnvironments(companyId);
    if (this.models.list(companyId, 1).length === 0) this.seedModels(companyId);
  }

  private seedTools(companyId: string): void {
    for (const [id, capabilities, risk, profiles, network] of [
      [
        "shell",
        ["files", "build", "test"],
        "high",
        ["engineering", "restricted-review"],
        "inference-only",
      ],
      ["scoped-search", ["search"], "medium", ["research"], "search-only"],
      ["browser", ["browser"], "high", ["browser"], "audited-internet"],
      ["github-cli", ["git", "api"], "high", ["engineering"], "audited-internet"],
      ["vercel-cli", ["deployment"], "critical", ["engineering"], "audited-internet"],
      [
        "workforce-mail",
        ["mail", "coordination"],
        "medium",
        ["document", "research", "engineering", "browser", "restricted-review"],
        "inference-only",
      ],
    ] as const)
      this.tools.save({
        companyId,
        id,
        version: "managed-by-image",
        provider: "workforce",
        capabilities: [...capabilities],
        risk,
        inputSchema: { type: "object" },
        outputSchema: { type: "object" },
        requiredEnvironment: null,
        networkPolicy: { mode: network },
        secretRequirements:
          id === "github-cli" ? ["GH_TOKEN"] : id === "vercel-cli" ? ["VERCEL_TOKEN"] : [],
        sandboxProfiles: [...profiles],
        permissionPolicy: { default: "deny", requireTaskGrant: true },
        health: "unknown",
        testReceiptId: null,
        auditBehavior: "record invocation and bounded result",
      });
  }

  private seedEnvironments(companyId: string): void {
    this.environments.save({
      companyId,
      id: "universal",
      name: "Universal agent sandbox",
      sandboxImage: "workforce-agent:0.1.0",
      runtime: { user: "10001:10001", rootFilesystem: "read-only" },
      buildToolchain: ["audited-tool-registry:/work/.tools"],
      browser: { provider: "chromium", hostBrowser: false },
      networkPolicy: { default: "inference-only", auditedProxyRequired: true },
      inputContract: { mode: "copy", hostMounts: false },
      secretsPolicy: { scopedInjectionOnly: true },
      resourcePolicy: { cpu: 1, memoryMb: 1024, pids: 128 },
      outputContract: { privateVolume: true, validatedExport: true },
      cleanupPolicy: { containers: "immediate", volumes: "retained-by-policy" },
      supportedProfiles: ["document", "research", "engineering", "browser", "restricted-review"],
      health: "unknown",
      healthReceiptId: null,
    });
  }

  private seedModels(companyId: string): void {
    for (const [id, engine] of [
      ["opencode-default", "opencode"],
      ["kilo-default", "kilo"],
    ] as const)
      this.models.save({
        companyId,
        id,
        engine,
        model: "unconfigured",
        provider: "user-configured",
        capabilities: [],
        supportedRoles: ["general"],
        secretRequirements: [],
        contextLimit: null,
        freePreferred: true,
        localModel: false,
        priority: engine === "opencode" ? 60 : 50,
        health: "unknown",
        verifiedAt: null,
        verificationReceiptId: null,
        failureClass: null,
      });
  }
}
