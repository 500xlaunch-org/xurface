# xurface (TypeScript / JavaScript)

Give your AI agents a **record** and a **conscience**, in one call.

[Xurface Horizon](https://xurface.500xlaunch.com) is the discernment checkpoint
an agent routes through before it takes a critical action on a person's behalf.
This SDK records every critical action on Horizon's signed audit ledger and, when
the risk exceeds what the person tolerates, holds it for their approve / edit /
deny in the Xurface Discern app - and the agent waits for the verdict.

Modern ESM, zero runtime dependencies (uses the global `fetch`). Node >= 18.

## Install

```bash
npm install xurface
```

## Use

```js
import { Xurface } from "xurface";

const xf = new Xurface({ clientId, clientSecret });          // Solution creds

await xf.declareAgent("apply-bot", {                         // Horizon scores each ability
  display_name: "Apply Bot",
  abilities: [
    { key: "offers.scan", kind: "skill", description: "Scan the inbox for job offers" },
    { key: "pay.invoice", kind: "capability", description: "Pay an invoice",
      developer_risk: { financial: "HIGH" } },
  ],
});

const user = await xf.resolveUser("email", "ada@example.com");

const verdict = await xf.guard({
  user, agent: "apply-bot", capability: "pay.invoice",
  details: { amount: 2400 }, wait: 120000,                   // block up to 2 min for a decision
});

if (verdict.allowed) await reallyPay(verdict.details);       // details may be human-edited
else console.log("not allowed:", verdict.state, verdict.reasons);
```

- within appetite -> `allowed` immediately, and logged;
- above appetite / SEVERE / developer `always` -> `held`, pushed to Discern;
  `guard` blocks until the person decides (or `wait` elapses);
- the person can **edit** the arguments before approving - they come back in
  `verdict.details`.

## Framework adapters

Each adapter wraps a framework's tool abstraction so a held/denied action comes
back as an ordinary tool result the model can read. Import per framework:

```js
import { createOpenAIGuard }    from "xurface/openai";
import { createAnthropicGuard } from "xurface/anthropic";
import { createGeminiGuard }    from "xurface/gemini";
```

Coding agents (Claude Code / Cursor / Zed / Windsurf) use the MCP server at
`xurface/mcp-server` (a stdio Model Context Protocol server exposing
`xurface_guard`). Python adds LangGraph and CrewAI in the [`sdk-python`](../sdk-python)
package.

**Add your framework** in ~40 lines: see the repo's
[CONTRIBUTING.md](../../CONTRIBUTING.md). Copy [`adapters/gemini.mjs`](adapters/gemini.mjs)
and make it pass the adapter contract test.

## Test

```bash
npm test           # runs the adapter contract test (offline, no Horizon needed)
```

The contract test (`test/adapter-contract.test.mjs`) is the bar every adapter -
including a contributed one - must pass: an allowed capability runs the tool, a
held/denied one does not, and the adapter guards with the declared capability and
the model's args. Full end-to-end tests against a live Horizon core live in the
platform.

Part of [Xurface](https://github.com/500xlaunch-org/xurface). A product of 500xLaunch.
