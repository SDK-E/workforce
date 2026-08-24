import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { extname, isAbsolute, normalize, resolve, sep } from "node:path";
import { extract, list } from "tar";
import type { AttemptRecord } from "../supervision/attempt-types.js";
import type { DockerClient } from "../supervision/docker-client.js";
import type { ArtifactLimits, ArtifactRecord, ArtifactSink } from "./artifact-types.js";

const defaults: ArtifactLimits = {
  maxFiles: 2_000,
  maxFileBytes: 25 * 1_048_576,
  maxTotalBytes: 100 * 1_048_576,
};

interface ManifestEntry {
  path: string;
  size: number;
  type: string;
}

export class ArtifactPipeline {
  constructor(
    private readonly root: string,
    private readonly repository: ArtifactSink,
    private readonly docker: DockerClient,
    private readonly limits: ArtifactLimits = defaults,
  ) {}

  async finalize(
    attempt: AttemptRecord,
    secrets: Record<string, string>,
  ): Promise<ArtifactRecord[]> {
    const attemptRoot = resolve(this.root, "artifacts", attempt.id);
    const archive = resolve(this.root, "artifacts", `${attempt.id}.tar`);
    await mkdir(attemptRoot, { recursive: true, mode: 0o700 });
    try {
      await this.docker.exportVolume(
        attempt.sandbox.workspace.name,
        attempt.sandbox.image,
        archive,
      );
      const entries = await this.validateManifest(archive);
      await extract({
        file: archive,
        cwd: attemptRoot,
        strict: true,
        preservePaths: false,
        preserveOwner: false,
        unlink: true,
        filter: (_path, entry) =>
          "type" in entry && (entry.type === "File" || entry.type === "Directory"),
      });
      const records = await this.recordFiles(attempt, attemptRoot, entries, secrets);
      this.repository.addReceipt({
        companyId: attempt.companyId,
        taskId: attempt.taskId,
        attemptId: attempt.id,
        validator: "artifact-manifest-v1",
        status: "passed",
        details: {
          files: records.length,
          bytes: records.reduce((sum, item) => sum + item.sizeBytes, 0),
        },
      });
      return records;
    } catch (error) {
      await rm(attemptRoot, { recursive: true, force: true });
      this.repository.addReceipt({
        companyId: attempt.companyId,
        taskId: attempt.taskId,
        attemptId: attempt.id,
        validator: "artifact-manifest-v1",
        status: "failed",
        details: { reason: error instanceof Error ? error.message : "Artifact validation failed" },
      });
      throw error;
    } finally {
      await rm(archive, { force: true });
    }
  }

  private async validateManifest(archive: string): Promise<ManifestEntry[]> {
    if ((await stat(archive)).size > this.limits.maxTotalBytes + 1_048_576)
      throw new Error("Artifact archive exceeds the configured limit");
    const entries: ManifestEntry[] = [];
    let total = 0;
    await list({
      file: archive,
      strict: true,
      onReadEntry: (entry) => {
        const path = safeRelativePath(entry.path);
        if (!path) return;
        if (entry.type !== "File" && entry.type !== "Directory")
          throw new Error(`Unsupported artifact entry type: ${entry.type}`);
        if (entry.type === "File") {
          if (entry.size > this.limits.maxFileBytes)
            throw new Error(`Artifact file exceeds limit: ${path}`);
          total += entry.size;
          entries.push({ path, size: entry.size, type: entry.type });
        }
        if (entries.length > this.limits.maxFiles || total > this.limits.maxTotalBytes)
          throw new Error("Artifact manifest exceeds configured limits");
      },
    });
    return entries;
  }

  private async recordFiles(
    attempt: AttemptRecord,
    root: string,
    entries: ManifestEntry[],
    secrets: Record<string, string>,
  ): Promise<ArtifactRecord[]> {
    const records: ArtifactRecord[] = [];
    const secretValues = Object.values(secrets)
      .filter(Boolean)
      .map((value) => Buffer.from(value));
    const files: { entry: ManifestEntry; storagePath: string; content: Buffer }[] = [];
    for (const entry of entries) {
      const storagePath = resolve(root, entry.path);
      if (!storagePath.startsWith(`${root}${sep}`))
        throw new Error("Artifact escaped storage root");
      const content = await readFile(storagePath);
      if (secretValues.some((value) => content.includes(value)))
        throw new Error(`Artifact contains an injected secret: ${entry.path}`);
      files.push({ entry, storagePath, content });
    }
    for (const { entry, storagePath, content } of files) {
      records.push(
        this.repository.add({
          companyId: attempt.companyId,
          taskId: attempt.taskId,
          attemptId: attempt.id,
          relativePath: entry.path,
          mediaType: mediaType(entry.path),
          sizeBytes: content.byteLength,
          sha256: createHash("sha256").update(content).digest("hex"),
          storagePath,
        }),
      );
    }
    return records;
  }
}

function safeRelativePath(value: string): string {
  const path = normalize(value.replace(/^\.\//, ""));
  if (!path || path === ".") return "";
  if (isAbsolute(path) || path === ".." || path.startsWith(`..${sep}`))
    throw new Error(`Unsafe artifact path: ${value}`);
  return path;
}

function mediaType(path: string): string {
  const known: Record<string, string> = {
    ".json": "application/json",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".html": "text/html",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  };
  return known[extname(path).toLowerCase()] ?? "application/octet-stream";
}
