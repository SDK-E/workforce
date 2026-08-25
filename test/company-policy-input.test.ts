import assert from "node:assert/strict";
import test from "node:test";
import { parseCompanyPolicies } from "../src/tui/overlays/company-policy-input.js";

test("company policy form accepts configurable shareholder governance and rejects non-objects", () => {
  assert.deepEqual(
    parseCompanyPolicies('{"shareholders":[{"name":"Founder","votingPercent":75}]}'),
    { shareholders: [{ name: "Founder", votingPercent: 75 }] },
  );
  assert.deepEqual(parseCompanyPolicies(""), {});
  assert.throws(() => parseCompanyPolicies("[]"), /JSON object/);
  assert.throws(() => parseCompanyPolicies("{"), /valid JSON object/);
});
