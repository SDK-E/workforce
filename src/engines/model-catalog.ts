import { randomUUID } from "node:crypto";
import { execa } from "execa";
import { isValidModelIdentity } from "./engine-adapter.js";

export type CatalogEngine = "opencode" | "kilo";

/**
 * Engine CLIs print one canonical `engine/provider/model` identity per line, but may interleave
 * startup noise (kilo prints one-time migration lines). Keep only identities for the requested
 * engine that pass the adapter's runnable-identity rule, so discovery never offers a model that
 * execution would refuse.
 */
export function parseModelCatalog(engine: CatalogEngine, output: string): string[] {
  const prefix = `${engine}/`;
  const identities = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith(prefix) && isValidModelIdentity(line));
  return [...new Set(identities)].sort();
}

/** Derives the registry provider field from a canonical catalog identity. */
export function providerForIdentity(engine: CatalogEngine, identity: string): string {
  const rest = identity.slice(engine.length + 1);
  const slash = rest.indexOf("/");
  return slash > 0 ? rest.slice(0, slash) : engine;
}

/**
 * Runs `<engine> models` inside the hardened agent image; the agent engine binary never runs on
 * the host. Results are cached briefly because kilo performs a one-time database migration per
 * fresh container that can take minutes.
 */
export class DockerModelCatalogRunner {
  private readonly cache = new Map<CatalogEngine, { at: number; models: string[] }>();

  constructor(
    private readonly image = "workforce-agent:0.1.0",
    private readonly ttlMs = 10 * 60_000,
  ) {}

  async catalog(engine: CatalogEngine): Promise<string[]> {
    const cached = this.cache.get(engine);
    if (cached && Date.now() - cached.at < this.ttlMs) return cached.models;
    const result = await execa(
      "docker",
      [
        "run",
        "--rm",
        "--name",
        `workforce-model-catalog-${randomUUID()}`,
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
        "none",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=64m,uid=10001,gid=10001",
        // The engine CLIs write caches/migration state under their working directory; give them
        // an ephemeral writable /work so the read-only root stays intact.
        "--tmpfs",
        "/work:rw,noexec,nosuid,size=64m,uid=10001,gid=10001",
        "--env",
        "HOME=/tmp",
        this.image,
        engine,
        "models",
      ],
      { reject: false, timeout: 300_000, maxBuffer: 4_194_304 },
    );
    if (result.exitCode !== 0)
      throw new Error(
        `Model catalog unavailable for ${engine}: ${(result.stderr || result.stdout).slice(-400)}`,
      );
    const models = parseModelCatalog(engine, result.stdout);
    this.cache.set(engine, { at: Date.now(), models });
    return models;
  }
}
