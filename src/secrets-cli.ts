import { stdin } from "node:process";
import { CredentialImporter } from "./secrets/credential-importer.js";
import { EncryptedSecretStore } from "./secrets/encrypted-secret-store.js";

const [provider, companyId, employeeId = "ceo", taskId = "*", secretName] = process.argv.slice(2);
if (!provider || !companyId)
  throw new Error(
    "Usage: secrets:import <github|github-stdin|vercel|stdin> <company> [employee] [task] [name]",
  );
const secrets = new EncryptedSecretStore(process.env.WORKFORCE_STATE_ROOT ?? ".workforce");
secrets.initialize();
const importer = new CredentialImporter(secrets);
const scope = { employeeIds: [employeeId], taskIds: [taskId] };
try {
  if (provider === "github") await importer.importGitHub(companyId, scope);
  else if (provider === "vercel" || provider === "github-stdin" || provider === "stdin") {
    if (stdin.isTTY)
      throw new Error("Pipe the credential through stdin; interactive echo is refused");
    let token = "";
    stdin.setEncoding("utf8");
    for await (const chunk of stdin) token += String(chunk);
    importer.importProtectedToken(
      companyId,
      provider === "github-stdin"
        ? "GITHUB_TOKEN"
        : provider === "vercel"
          ? "VERCEL_TOKEN"
          : (secretName ?? ""),
      token,
      scope,
    );
  } else throw new Error(`Unsupported credential provider: ${provider}`);
  process.stdout.write(
    `${provider === "github-stdin" ? "github" : provider === "stdin" ? secretName : provider} credential stored with company/employee/task scope\n`,
  );
} finally {
  secrets.close();
}
