<p align="center">
  <img src="brand/xurface-icon.svg" width="88" height="88" alt="Xurface" />
</p>

<h1 align="center">Xurface</h1>

<p align="center"><b>Approve what your AI agents do, from your phone.</b><br/>
<i>Beyond human in the loop. Human on the go.</i></p>

---

AI agents now act on our behalf around the clock. They pay, publish, deploy and
delete, and every credential they hold was designed for a human at a keyboard.
Passwords, passkeys and 2FA answer *"who is this?"*. They cannot answer
*"should this happen?"*.

**Xurface is the discernment checkpoint between an agent's intent and its
consequence.** Every action is classified by criticity. Actions below your
delegation threshold pass automatically and are logged. Actions above it are
pushed to your phone; you approve, deny or edit; the agent resumes with a
signed decision that is written to an audit trail.

## Three endpoints

Framework and skill agnostic. Or nothing at all if your tools run through the
Xurface MCP server.

```ts
import { Xurface } from "@xurface/sdk";

const xf = new Xurface({ solution: "acme-billing", key: process.env.XURFACE_KEY });

// classify the action, then decide
const risk = await xf.onXurface({
  user, agent: "billing-bot",
  capability: "pay_invoice",
  details: { amount: 2400, currency: "USD", payee: "Supplier Co" }
});
if (risk.state === "allowed") return execute(risk.token);

await xf.pushXurface(risk.id);                 // ping the phone
const ok = await xf.awaitXurface(risk.id);     // wait for a human
if (ok.state === "approved") return execute(ok.token, ok.editedDetails);
```

## How it works

```
Developers  ->  Xurface  ->  Users
```

- **Developers** bring their agents and declare what each one can do and how much
  each action matters. Three calls, or existing MCP tools.
- **Xurface** weighs every action. Routine ones pass and are logged. High-stakes
  ones wait for a human. Every decision is signed.
- **Users** get one inbox for every agent, from every vendor. Approve, deny or
  edit from a phone. Passwords, passkeys and 2FA stay under the user's control.

## Criticity

| Level | Typical actions | Behaviour |
|---|---|---|
| **Low** | read, search, list | passes, logged |
| **Medium** | draft, small spend within budget | passes in budget, logged |
| **High** | send, publish, pay above a threshold | waits for the human |
| **Severe** | delete, change access or credentials | waits, with biometric; never delegated |

## What lands here

This repository is the public home for the Xurface developer surface:

- `spec/` the Discernment Event specification (event model, criticity, decision claims)
- `packages/` the TypeScript and Python SDKs and framework integrations
- `skills/` an agent skill for requesting discernment
- `examples/` runnable end-to-end examples
- `brand/` logo and marks

It is early. The pieces are landing in the open.

## Status

Early development. Want in early? Reach us at `digital@500xlaunch.com`.

## License

**Apache-2.0.** This is the open interface to Xurface. The SDKs, the Discernment
Event specification, the skills and the examples are meant to be used, implemented
and extended freely, including an explicit patent grant for anyone building on the
protocol. The running service (platform, infrastructure and app) is separate and
not part of this repository.

Xurface is a product of 500xLaunch.
