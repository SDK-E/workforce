import { randomUUID } from "node:crypto";
import { execa } from "execa";
import { engineAdapter } from "../engines/engine-adapter.js";
import type { ModelRecord } from "./registry-types.js";
import type { ModelRepository } from "./model-repository.js";

export interface ModelProbeResult {
  healthy: boolean;
  details: Record<string, unknown>;
}

export interface ModelProbeRunner {
  probe(model: ModelRecord, secrets: Record<string, string>): Promise<ModelProbeResult>;
}

export class DockerModelProbeRunner implements ModelProbeRunner {
  constructor(
    private readonly image = "workforce-agent:0.1.0",
    private readonly network = "workforce-egress-internal",
    private readonly proxyUrl = "http://workforce-egress-proxy:3128",
  ) {}

  async probe(model: ModelRecord, secrets: Record<string, string>): Promise<ModelProbeResult> {
    const adapter = engineAdapter(model.engine);
    const secretNames = Object.keys(secrets);
    for (const name of secretNames)
      if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(name)) throw new Error(`Invalid secret name: ${name}`);
    const result = await execa(
      "docker",
      [
        "run",
        "--rm",
        "--name",
        `workforce-model-probe-${randomUUID()}`,
        "--label",
        "workforce.managed=true",
        "--read-only",
        "--user",
        "10001:10001",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges:true",
        "--network",
        this.network,
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=64m,uid=10001,gid=10001",
        "--env",
        "HOME=/tmp",
        "--env",
        "HTTPS_PROXY",
        "--env",
        "HTTP_PROXY",
        ...secretNames.flatMap((name) => ["--env", name]),
        this.image,
        ...adapter.executionCommand({
          engine: model.engine,
          model: model.model,
          objective: "Reply with exactly WORKFORCE_MODEL_READY",
        }),
      ],
      {
        reject: false,
        timeout: 60_000,
        maxBuffer: 1_048_576,
        env: { ...process.env, HTTPS_PROXY: this.proxyUrl, HTTP_PROXY: this.proxyUrl, ...secrets },
      },
    );
    const output = `${result.stdout}\n${result.stderr}`.slice(-4_000);
    return {
      healthy: result.exitCode === 0 && /WORKFORCE_MODEL_READY/i.test(output),
      details: {
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        engine: model.engine,
        model: model.model,
        output,
        failureClass: result.timedOut
          ? "timeout"
          : result.exitCode === 0
            ? "invalid-response"
            : "startup-failed",
      },
    };
  }
}

export class ModelVerifier {
  constructor(
    private readonly models: ModelRepository,
    private readonly runner: ModelProbeRunner,
    private readonly secrets: (model: ModelRecord) => Record<string, string>,
  ) {}

  async verify(companyId: string, modelId: string, actorId: string): Promise<ModelRecord> {
    const model = this.models.get(companyId, modelId);
    if (!model) throw new Error(`Unknown model: ${modelId}`);
    if (model.model === "unconfigured") throw new Error("Configure the model before verification");
    const secrets = this.secrets(model);
    const result = await this.runner.probe(model, secrets);
    return this.models.recordVerification(
      companyId,
      modelId,
      result.healthy,
      redactDetails(result.details, Object.values(secrets)),
      actorId,
    );
  }
}

function redactDetails(
  details: Record<string, unknown>,
  secrets: string[],
): Record<string, unknown> {
  const nonEmptySecrets = secrets.filter(Boolean);
  return Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      typeof value === "string"
        ? nonEmptySecrets.reduce(
            (current, secret) => current.replaceAll(secret, "[REDACTED]"),
            value,
          )
        : value,
    ]),
  );
}
