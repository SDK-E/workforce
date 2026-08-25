import assert from "node:assert/strict";
import test from "node:test";
import { parseModelCatalog, providerForIdentity } from "../src/engines/model-catalog.js";

test("catalog parser keeps only runnable canonical identities for the engine", () => {
  const output = [
    "Performing one time database migration, may take a few minutes...",
    "kilo/~anthropic/claude-fable-latest",
    "kilo/aion-labs/aion-2.0",
    "kilo/z-ai/glm-5.2",
    "kilo/z-ai/glm-5.2",
    "opencode/big-pickle",
    "",
  ].join("\n");
  assert.deepEqual(parseModelCatalog("kilo", output), [
    "kilo/aion-labs/aion-2.0",
    "kilo/z-ai/glm-5.2",
  ]);
  assert.deepEqual(parseModelCatalog("opencode", output), ["opencode/big-pickle"]);
});

test("catalog parser drops identities the engine adapter cannot execute", () => {
  // "~provider" aliases are not valid run targets per the adapter's identity rule.
  const output = ["kilo/~openai/gpt-latest", "kilo/openai/gpt-5"].join("\n");
  assert.deepEqual(parseModelCatalog("kilo", output), ["kilo/openai/gpt-5"]);
});

test("provider derives from the identity's middle segment when present", () => {
  assert.equal(providerForIdentity("opencode", "opencode/big-pickle"), "opencode");
  assert.equal(providerForIdentity("kilo", "kilo/z-ai/glm-5.2"), "z-ai");
});
