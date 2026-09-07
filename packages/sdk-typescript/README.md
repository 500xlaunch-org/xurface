# @xurface/sdk (TypeScript)

Discernment for AI agents. Manifest in, three calls out. Zero dependencies,
Node 18+.

## Install

Not on npm yet (early). Use it from this repo:

```bash
npm install github:500xlaunch-org/xurface#main --workspace packages/sdk-typescript
# or vendor packages/sdk-typescript into your project and `npm run build`
```

## Use

```ts
import { Xurface } from "@xurface/sdk";

// 1. the downloaded Solution Manifest (or set XURFACE_SOLUTION_SPEC)
const xf = Xurface.fromSpec("./xurface-solution.json");

// 2. declare the agent: identity + what it can do on behalf of the user
await xf.declareAgent("apply-bot", {
  displayName: "Apply Bot",
  logo: "https://cdn.acme.dev/apply-bot.png",
  description: "Finds relevant job offers and replies to the ones worth your time.",
  abilities: [
    { key: "gmail.connect", kind: "capability", criticity: "HIGH", requires_auth: ["mail.gmail"] },
    { key: "offers.scan",   kind: "skill",      criticity: "LOW" },
    { key: "reply.draft",   kind: "tool",       criticity: "MEDIUM" },
    { key: "reply.send",    kind: "tool",       criticity: "HIGH" },
  ],
});

// 3. self-discovery: the id your product already has for the user
const found = await xf.discoverUser({ type: "email", value: "ada@example.com" });
if (found.status === "none") throw new Error("user not on Xurface yet");

// 4. guard the consequential action (classify -> push -> await, in one call)
const ok = await xf.guard({
  user: found.user!,
  agent: "apply-bot",
  capability: "reply.send",
  details: { to: "hr@corp.com", subject: "Application" },
});
// ok.state === "allowed" | "approved" (throws on deny)

// sequences: one card, several steps; deny always denies all
await xf.guard({
  user: found.user!,
  agent: "apply-bot",
  capability: "jobhunt.run",
  sequence: [
    { capability: "gmail.connect" },
    { capability: "offers.scan" },
    { capability: "reply.draft" },
    { capability: "reply.send", input_request: "Anything to add to the replies?" },
  ],
});
```

Rate limits and discernment budgets are enforced server-side; the client backs off
automatically on 429 and exposes `xf.rateLimit` for pacing. See
[`spec/rate-limits.md`](../../spec/rate-limits.md).
