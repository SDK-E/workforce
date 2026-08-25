import { execa } from "execa";
import type { EncryptedSecretStore } from "./encrypted-secret-store.js";
import type { SecretMetadata, SecretScope } from "./secret-types.js";

export class CredentialImporter {
  constructor(
    private readonly secrets: EncryptedSecretStore,
    private readonly githubToken: () => Promise<{ exitCode?: number; stdout: string }> = async () =>
      await execa("gh", ["auth", "token"], {
        reject: false,
        timeout: 10_000,
        env: { ...process.env, GH_PROMPT_DISABLED: "1" },
      }),
  ) {}

  async importGitHub(
    companyId: string,
    scope: SecretScope,
    name = "GITHUB_TOKEN",
  ): Promise<SecretMetadata> {
    const result = await this.githubToken();
    const token = result.stdout.trim();
    if (result.exitCode !== 0 || !token)
      throw new Error("GitHub credential import failed; authenticate gh CLI first");
    return this.secrets.set(companyId, name, token, scope);
  }

  importVercel(
    companyId: string,
    tokenFromProtectedInput: string,
    scope: SecretScope,
    name: "VERCEL_TOKEN" = "VERCEL_TOKEN",
  ): SecretMetadata {
    return this.importProtectedToken(companyId, name, tokenFromProtectedInput, scope);
  }

  importProtectedToken(
    companyId: string,
    name: string,
    tokenFromProtectedInput: string,
    scope: SecretScope,
  ): SecretMetadata {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(name))
      throw new Error("Credential name must be an uppercase environment name");
    const token = tokenFromProtectedInput.trim();
    if (!token) throw new Error("Credential input was empty");
    return this.secrets.set(companyId, name, token, scope);
  }
}
