---
name: xurface
description: Request the user's discernment before consequential actions (send, publish, pay, delete, force-push, credential use, spending). Use whenever an action is HIGH or SEVERE stakes and the user is not at the keyboard. Requires a Horizon Solution Manifest (XURFACE_SOLUTION_SPEC).
---

# Xurface: ask the human before it happens

You are an agent acting on a user's behalf. Some actions are yours to take;
some are theirs to decide. This skill tells you which is which and how to ask,
even when the user is away from the keyboard. The ask reaches their phone
(Xurface Discern); you wait for the decision and continue.

## When to invoke

You do not judge the stakes yourself, and you do not skip the call because an
action "feels routine." Route every consequential action through `guard`.
Horizon scores its risk (identity, financial, location, intellectual,
conversation, data, systems) and reconciles that with the user's appetite; it
returns `allowed` (passes instantly, still logged) or pushes it to their phone.

- Hard-to-reverse or outward-facing actions (send, publish, deploy, pay,
  force-push, drop a migration, apply in the user's name) are the ones most
  likely to come back as a prompt.
- **SEVERE** actions (delete, change access, scopes or credentials) can never be
  auto-approved and require a biometric.

Never act on a capability you did not declare: it will always ask, and the user
can report it. Declare it instead.

## Setup (once per session)

1. The manifest path is in the `XURFACE_SOLUTION_SPEC` environment variable (or
   at `./xurface-solution.json`). If neither exists, tell the user to download
   it from the Horizon console; do not improvise credentials.
2. Declare yourself once: id, name, logo, description, and your abilities. You do
   not set a criticity; Horizon scores each ability and returns its severity.
   Declare everything you can do, honestly. Use the SDK (`@xurface/sdk` or
   `xurface` on Python), or raw REST per `spec/openapi.yaml`.
3. Discover the user from the id the workspace gives you (usually an email).
   `status: "none"` means the user is not on Xurface; say so and stop asking.

## The ask

Use `guard` (classify, push, await in one call):

```ts
import { Xurface } from "@xurface/sdk";
const xf = Xurface.fromSpec();
const ok = await xf.guard({
  user: XID, agent: "coding-agent",
  capability: "git.force_push",
  details: { repo: "acme/api", branch: "main", commits_dropped: 2 },
});
// proceed only on ok.state === "allowed" | "approved"
```

Rules of conduct:

- **Details are for a human on a phone.** Name the thing, the target and the
  amount. "Force-push acme/api main, dropping 2 commits", not a JSON dump.
- **Batch.** Several consequential steps that belong together go in ONE
  `sequence`, not five separate asks. The user can Approve a step, Approve all,
  or Deny. Deny always denies the whole sequence: stop everything in it.
- **Never retry a denied action.** Rephrase-and-ask-again is a violation.
- **Respect the budget.** On 429, wait; do not route around discernment.
- If a step needs a value only the user has, set `input_request`; the answer
  comes back in `decision.input`. Use sparingly. This is discernment, not chat.

## While you wait

`awaitXurface` long-polls. Keep working on anything that does not depend on the
decision; park the dependent work. On `expired`, ask once more only if the action
is still needed.
