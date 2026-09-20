# Xurface Developer Guide

Two journeys, one page:

- **[Using Horizon](#part-1-using-horizon)** - put a discernment checkpoint in
  front of your agent's critical actions in about ten minutes.
- **[Contributing on GitHub](#part-2-contributing-on-github)** - add a framework
  adapter (or more) and get it merged.

If you read nothing else: your agent **declares** what it can do, Horizon
**scores** the risk, the person **sets an appetite**, and at runtime you wrap
each consequential action in **`guard()`**. Routine actions pass and are logged;
risky ones are held for the person's approve / edit / deny on their phone. You
never hard-code a threshold.

---

## Part 1: Using Horizon

### 1. Get a Solution

A **Solution** is your app as Horizon sees it. Registering one gives you a
`client_id` and `client_secret` (the agent side) and lets people link you in the
Xurface Discern app. You get these from the Horizon console at
`https://xurface.500xlaunch.com`, or from your platform operator.

```
client_id     = cli_...
client_secret = xsk_...
```

### 2. Install the SDK

```bash
npm install @xurface/sdk        # TypeScript / JavaScript
pip install xurface             # Python
```

Both are dependency-light (the TS SDK uses `fetch`; the Python SDK is stdlib
only) and target Node 18+ / Python 3.10+.

### 3. Declare your agent

Declare each agent once, on boot. List its abilities; Horizon scores every one
against a standards-based taxonomy (identity, financial, location, intellectual,
conversation, data, system) and returns the effective severity. `developer_risk`
is optional and can only *raise* Horizon's own score, never lower it.

```js
import { Xurface } from "@xurface/sdk";
const xf = new Xurface({ clientId, clientSecret });

await xf.declareAgent("apply-bot", {
  display_name: "Apply Bot",
  abilities: [
    { key: "offers.scan", kind: "skill",      description: "Scan the inbox for job offers" },
    { key: "reply.send",  kind: "tool",       description: "Send a reply to a recruiter" },
    { key: "pay.invoice", kind: "capability", description: "Pay an invoice",
      developer_risk: { financial: "HIGH" } },
  ],
});
```

### 4. Resolve the person

A person connects your Solution to themselves by linking it in Xurface Discern
(a consent step - a match is never silently a link). Once linked, resolve them to
the pairwise id you use at runtime:

```js
const user = await xf.resolveUser("email", "ada@example.com");  // -> "xid_..." or null
```

### 5. Guard the action

This is the whole point. `guard()` records the action on Horizon's signed,
hash-chained ledger and reconciles it against the person's appetite. Within
appetite it returns immediately; above appetite (or SEVERE, or an ability you
marked `discernment: "always"`) it is held, pushed to the person's device, and
`guard()` waits up to `wait` ms for their decision.

```js
const verdict = await xf.guard({
  user, agent: "apply-bot", capability: "pay.invoice",
  details: { amount: 2400, to: "acme-invoicing" },
  wait: 120000,                       // block up to 2 minutes for a human decision
});

if (verdict.allowed) {
  await reallyPay(verdict.details);   // details may be the person's EDITED values
} else {
  // "pending" (timed out), "denied", or "expired" - do not act
  console.log("not allowed:", verdict.state, verdict.reasons);
}
```

`verdict.state` is one of `allowed | approved | edited | pending | denied |
expired`. SEVERE actions never auto-allow and require a biometric assertion at
approval. The person can edit your arguments before approving; use
`verdict.details`.

### 6. Or let an adapter do it

If your agent already calls tools through a framework, use the matching adapter
and your tool bodies do not change - the adapter guards every call and turns a
held/denied one into an ordinary tool result the model can read.

```js
import { createOpenAIGuard } from "@xurface/sdk/openai";
const guard = createOpenAIGuard(xf, { user, agent: "apply-bot", wait: 120000 });
const reg = guard.register([
  { name: "send_reply", capability: "reply.send",
    parameters: { type: "object", properties: { to: { type: "string" } } },
    run: async ({ to }) => sendEmail(to) },
]);
// put reg.openaiTools in your chat.completions request; then:
for (const call of message.tool_calls) toolMessages.push(await reg.dispatch(call));
```

Adapters available: **OpenAI**, **Anthropic Claude**, **Google Gemini**,
**LangChain / LangGraph** (Python), **CrewAI** (Python), and an **MCP server**
for coding agents (Claude Code / Cursor / Zed):

```json
// .mcp.json - Claude Code routes deploys, deletes, spends, force-pushes through Horizon
{ "mcpServers": { "xurface": {
  "command": "npx", "args": ["-y", "@xurface/sdk", "xurface-mcp"],
  "env": { "XURFACE_CLIENT_ID": "cli_...", "XURFACE_CLIENT_SECRET": "xsk_...",
           "XURFACE_AGENT": "coding-agent", "XURFACE_USER_REF": "email:you@company.com" } } } }
```

### 7. The person's side (for testing, and to understand the loop)

The person's app is built on the consumer API. In tests and demos you can drive
it directly to play the human:

```js
import { XurfaceConsumer } from "@xurface/sdk/consumer";
const person = new XurfaceConsumer();
await person.login("ada@example.com");
await person.approveLink();                          // consent to the Solution
await person.setAppetite(link, { financial: "LOW" }); // ask on anything above LOW money
const [held] = await person.inbox();                 // the discernment queue
await person.decide(held.id, "approve", { edited_details: { amount: 1000 } });
```

### 8. See it run

The repo ships four runnable, real-life scenarios (a coding agent, a finance
assistant, a support bot, an SRE agent). With a Solution's creds set:

```bash
export XURFACE_CLIENT_ID=cli_... XURFACE_CLIENT_SECRET=xsk_... XURFACE_USER=you@company.com
node examples/scenarios/payments.mjs
```

Each prints which actions flowed and which were held or refused. See
[`examples/scenarios/`](../examples/scenarios/). Full example Solutions live in
their own repos: [BattleMate](https://github.com/500xlaunch-org/battlemate) and
[FreeLeap](https://github.com/500xlaunch-org/freeleap).

### Test before you go live

Horizon runs two isolated environments in one deployment: **test** and **live**.
Build and try your agent in test - its own solutions, links, intents and audit
chain - then roll out to live unchanged. Select it with one option:

```js
const xf = new Xurface({ clientId, clientSecret, env: "test" }); // live is the default
```

```python
xf = Xurface(client_id=..., client_secret=..., env="test")
```

The SDK sends an `x-xurface-env` header; the person's Xurface Discern app has the
same Test / Live switch, so you can watch your test agent's cards arrive on your
phone without touching production.

### What you get for free

Every action - allowed or not - is on a signed, hash-chained audit ledger. An
agent that brute-forces a risk is contained. Actions are analyzed afterward for
gaps (a risk that should have prompted a person and did not). You declare once;
Horizon does the judging.

---

## Part 2: Contributing on GitHub

Xurface's mission needs many hands: more frameworks supported, more languages
spoken, more worked examples. The single highest-leverage contribution is a
**framework adapter** - about 40 lines, because all the risk logic lives in
Horizon, not in the adapter.

### Set up

```bash
git clone https://github.com/500xlaunch-org/xurface
cd xurface
# TypeScript SDK - no build, uses node's test runner:
cd packages/sdk-typescript && node --test test/ && cd -
# Python SDK - standard library only:
cd packages/sdk-python && python3 test/adapter_contract.py && cd -
```

### Repo layout

```
packages/sdk-typescript   the TS SDK + adapters (@xurface/sdk)
packages/sdk-python       the Python SDK + adapters (xurface)
examples/                 runnable samples, incl. examples/scenarios
integrations/             how to activate Xurface across agents/frameworks
registry/index.json       the public registry of SDKs
spec/                     the Discernment Event model (framework-agnostic)
toolkit/                  SUBMITTING.md + create-xurface-sdk scaffolder
```

### Ways to contribute

- A **framework adapter** (below) - the most useful first PR.
- A new **SDK language** (Go, Rust, Java): mirror the surface of
  `packages/sdk-typescript` - `declareAgent`, `resolveUser`, and `guard`.
- A **criticity rule pack**, an **event transport**, an **agent skill**, an
  **example Solution**, or improvements to the **spec** and docs.

### Add a framework adapter in 3 steps

**1. Copy the worked example.** Gemini was added exactly the way a contribution
is: [`packages/sdk-typescript/adapters/gemini.mjs`](../packages/sdk-typescript/adapters/gemini.mjs)
(or the Python `gemini.py`). Map your framework's tool calls onto `runGuarded`:

```js
import { runGuarded } from "../xurface.mjs";
export function createMyFrameworkGuard(xf, ctx /* { user, agent, wait } */) {
  return { register(tools) {
    const byName = new Map(tools.map((t) => [t.name, t]));
    return {
      myFrameworkTools: tools.map(toFrameworkSchema),
      async dispatch(toolCall) {
        const tool = byName.get(toolCall.name);
        const out = await runGuarded(xf, {
          user: ctx.user, agent: ctx.agent,
          capability: tool.capability || toolCall.name,
          args: toolCall.args, wait: ctx.wait,
        }, (finalArgs) => tool.run(finalArgs));
        return toFrameworkResult(toolCall, out);   // held/denied -> a result the model can read
      },
    };
  } };
}
```

An adapter only translates shapes. It never scores risk or sets a threshold.

**2. Pass the adapter contract test.** Every adapter must satisfy the same three
behaviors, checked offline against a `MockXurface` (no Horizon needed):

1. an *allowed* capability runs the tool body and surfaces the result;
2. a *held/denied* one does not run the tool body and signals blocked;
3. it guards with the tool's declared **capability** and the model's **args**.

Add a case modeled on the Gemini one in
[`packages/sdk-typescript/test/adapter-contract.test.mjs`](../packages/sdk-typescript/test/adapter-contract.test.mjs)
(`node --test test/`) or `packages/sdk-python/test/adapter_contract.py`. That is
the whole bar, and CI runs it.

**3. Open a PR** with the adapter, its contract-test case, and a line in the
package README's adapter list. Link an issue for anything non-trivial, keep it
focused, and sign the CLA (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

### What CI checks

On every push and PR: both adapter contract tests, the SDK barrel load, the
toolkit scaffolder, and that `registry/index.json` is valid JSON. Full
end-to-end tests against a live Horizon core run in the platform; for an adapter
PR the contract test is what gates the merge.

### The rules

- No em or en dashes in text you add (house style); use a hyphen or reword.
- Keep adapters dependency-free where you can; import a framework SDK lazily and
  degrade gracefully (see the LangGraph / CrewAI adapters, which fall back to a
  same-contract shim when the library is absent).
- Adapters translate shapes; they never score risk.
- Be excellent to each other. This is a fun mission: trustworthy agents for
  everyone. Welcome aboard.

Questions: `digital@500xlaunch.com`. Security: see [SECURITY.md](../SECURITY.md).
