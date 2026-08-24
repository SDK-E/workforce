import assert from "node:assert/strict";
import test from "node:test";
import { EngineCircuitBreaker } from "../src/engines/circuit-breaker.js";
import { engineAdapter } from "../src/engines/engine-adapter.js";

test("Kilo and OpenCode adapters verify identity and produce bounded startup commands", () => {
  const kilo = engineAdapter("kilo");
  assert.deepEqual(kilo.verificationCommand(), ["kilo", "--version"]);
  assert.equal(kilo.parseVersion("7.4.23\n"), "7.4.23");
  assert.deepEqual(
    kilo.executionCommand({
      engine: "kilo",
      model: "anthropic/claude-sonnet",
      objective: "Build safely",
    }),
    ["kilo", "run", "--model", "anthropic/claude-sonnet", "Build safely"],
  );
  assert.throws(() => kilo.parseVersion("unexpected"), /Invalid/);
  assert.throws(
    () => kilo.executionCommand({ engine: "kilo", model: "invalid", objective: "x" }),
    /provider\/model/,
  );
  assert.equal(engineAdapter("opencode").executable, "opencode");
});

test("engine circuit breaker fails over and recovers after cooldown", () => {
  const breaker = new EngineCircuitBreaker(2, 100);
  breaker.failure("kilo/model", 1_000);
  breaker.failure("kilo/model", 1_001);
  assert.equal(breaker.select(["kilo/model", "opencode/model"], 1_002), "opencode/model");
  assert.equal(breaker.select(["kilo/model"], 1_102), "kilo/model");
  breaker.success("kilo/model");
  assert.equal(breaker.canAttempt("kilo/model", 1_003), true);
});
