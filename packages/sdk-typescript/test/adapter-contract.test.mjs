/**
 * The adapter contract test - the bar every framework adapter (including a
 * contributed one) must pass. It uses a MockXurface, so it runs anywhere with no
 * Horizon server: a contributor can add an adapter and prove it in seconds.
 *
 * The contract is three behaviors:
 *   1. an ALLOWED capability runs the real tool body and surfaces the result;
 *   2. a HELD/DENIED capability does NOT run the tool body and signals blocked;
 *   3. the adapter guards with the tool's declared capability + the model's args.
 *
 * Run: node --test sdk/typescript/test/adapter-contract.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createOpenAIGuard } from "../adapters/openai.mjs";
import { createAnthropicGuard } from "../adapters/anthropic.mjs";
import { createGeminiGuard } from "../adapters/gemini.mjs";

/** A stand-in for the Xurface client: decides by a per-capability policy and
 * records every guard call, so an adapter can be tested without a server. */
class MockXurface {
  constructor(policy = {}) { this.policy = policy; this.calls = []; }
  async guard(p) {
    this.calls.push(p);
    const verdict = this.policy[p.capability] || "allow";
    const allowed = verdict === "allow";
    return {
      allowed, state: allowed ? "allowed" : "denied", intentId: "int_mock",
      severity: "HIGH", risk: {}, reasons: allowed ? ["within appetite"] : ["above appetite"],
      token: allowed ? "tok_mock" : undefined, details: p.details, decision: undefined,
    };
  }
}

test("OpenAI adapter satisfies the contract", async () => {
  const xf = new MockXurface({ pay_now: "deny" });
  let ranSafe = 0, ranPay = 0;
  const reg = createOpenAIGuard(xf, { user: "xid_x", agent: "a" }).register([
    { name: "safe_read", capability: "data.read", run: (a) => { ranSafe++; return { rows: 2, echo: a }; } },
    { name: "pay_now", capability: "pay_now", run: () => { ranPay++; return "paid"; } },
  ]);
  const ok = await reg.dispatch({ id: "c1", function: { name: "safe_read", arguments: JSON.stringify({ q: "x" }) } });
  const okBody = JSON.parse(ok.content);
  assert.equal(ok.role, "tool");
  assert.equal(okBody.ok, true);
  assert.deepEqual(okBody.result.echo, { q: "x" });      // args reached the tool
  assert.equal(ranSafe, 1);

  const held = JSON.parse((await reg.dispatch({ id: "c2", function: { name: "pay_now", arguments: "{}" } })).content);
  assert.equal(held.ok, false);
  assert.equal(held.blocked, true);
  assert.equal(ranPay, 0);
  assert.deepEqual(xf.calls.map((c) => c.capability), ["data.read", "pay_now"]);
});

test("Anthropic adapter satisfies the contract", async () => {
  const xf = new MockXurface({ "brief.broadcast": "deny" });
  let ranSafe = 0, ranBroad = 0;
  const reg = createAnthropicGuard(xf, { user: "xid_x", agent: "a" }).register([
    { name: "summarize", capability: "brief.summarize", run: (a) => { ranSafe++; return { echo: a }; } },
    { name: "broadcast", capability: "brief.broadcast", run: () => { ranBroad++; return "sent"; } },
  ]);
  const ok = await reg.dispatch({ type: "tool_use", id: "t1", name: "summarize", input: { n: 1 } });
  assert.equal(ok.type, "tool_result");
  assert.equal(ok.is_error, false);
  assert.equal(JSON.parse(ok.content).result.echo.n, 1);
  assert.equal(ranSafe, 1);

  const held = await reg.dispatch({ type: "tool_use", id: "t2", name: "broadcast", input: {} });
  assert.equal(held.is_error, true);
  assert.equal(ranBroad, 0);
});

test("Gemini adapter (the CONTRIBUTING example) satisfies the contract", async () => {
  const xf = new MockXurface({ "deploy.production": "deny" });
  let ranSafe = 0, ranDeploy = 0;
  const reg = createGeminiGuard(xf, { user: "xid_x", agent: "a" }).register([
    { name: "read_repo", capability: "repo.read", run: (a) => { ranSafe++; return { files: 3, echo: a }; } },
    { name: "deploy", capability: "deploy.production", run: () => { ranDeploy++; return "deployed"; } },
  ]);
  // gemini tool shape
  assert.ok(reg.geminiTools[0].functionDeclarations.length === 2);

  const ok = await reg.dispatch({ name: "read_repo", args: { path: "src/" } });
  assert.ok(ok.functionResponse);
  assert.equal(ok.functionResponse.name, "read_repo");
  assert.equal(ok.functionResponse.response.ok, true);
  assert.deepEqual(ok.functionResponse.response.result.echo, { path: "src/" });
  assert.equal(ranSafe, 1);

  const held = await reg.dispatch({ name: "deploy", args: { service: "api" } });
  assert.equal(held.functionResponse.response.ok, false);
  assert.equal(held.functionResponse.response.blocked, true);
  assert.equal(ranDeploy, 0);
  assert.deepEqual(xf.calls.map((c) => c.capability), ["repo.read", "deploy.production"]);
});
