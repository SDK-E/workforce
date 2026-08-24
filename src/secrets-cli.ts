import { stdin } from "node:process";
import { CredentialImporter } from "./secrets/credential-importer.js";
import { EncryptedSecretStore } from "./secrets/encrypted-secret-store.js";

const [provider, companyId, employeeId = "ceo", taskId = "*"] = process.argv.slice(2);
if (!provider || !companyId)
  throw new Error("Usage: secrets:import <github|vercel> <company> [employee] [task]");
const secrets = new EncryptedSecretStore(".workforce");
secrets.initialize();
const importer = new CredentialImporter(secrets);
const scope = { employeeIds: [employeeId], taskIds: [taskId] };
try {
  if (provider === "github") await importer.importGitHub(companyId, scope);
  else if (provider === "vercel") {
    if (stdin.isTTY)
      throw new Error("Pipe the Vercel token through stdin; interactive echo is refused");
    let token = "";
    stdin.setEncoding("utf8");
    for await (const chunk of stdin) token += String(chunk);
    importer.importVercel(companyId, token, scope);
  } else throw new Error(`Unsupported credential provider: ${provider}`);
  process.stdout.write(`${provider} credential stored with company/employee/task scope\n`);
} finally {
  secrets.close();
}
