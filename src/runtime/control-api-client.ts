export class ControlApiClient {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
  ) {}

  emergencyStop(): Promise<void> {
    return this.action({ action: "emergency-stop" });
  }
  startTask(companyId: string, taskId: string): Promise<void> {
    return this.action({ action: "start-task", companyId, taskId });
  }
  verifyMcp(companyId: string, serverId: string): Promise<void> {
    return this.action({ action: "verify-mcp", companyId, serverId });
  }
  verifyModel(companyId: string, modelId: string): Promise<void> {
    return this.action({ action: "verify-model", companyId, modelId });
  }
  async discoverModels(engine: "opencode" | "kilo"): Promise<string[]> {
    const response = await fetch(`${this.endpoint}/model-catalog?engine=${engine}`, {
      headers: { authorization: `Bearer ${this.token}` },
    });
    if (!response.ok) throw new Error(`Model catalog unavailable (${response.status})`);
    const payload = (await response.json()) as { models?: string[] };
    return payload.models ?? [];
  }

  private async action(input: Record<string, string>): Promise<void> {
    const response = await fetch(`${this.endpoint}/actions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`Workforce daemon rejected action (${response.status})`);
  }
}
