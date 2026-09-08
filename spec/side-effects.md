# Side Effects

> Status: draft. License: Apache-2.0 (this repository).

Scoring and appetite decide things up front. Side effects are the loop that
closes after the fact: when a user becomes aware of something an agent did, they
tell Horizon, and the developer learns from it.

There are two signals, and the difference matters.

## Flag: declared, but wrong

The action **was declared**, but it was mis-scored, or the agent acted without
respecting the user's appetite. The user points at the recorded action and flags
it, optionally suggesting a better score.

```
POST /v1/user/flag
{ "intent_id": "int_...",
  "reason": "you should have asked me before paying over 1000",
  "suggested": { "financial": "HIGH" } }
```

Horizon rejects a flag on an action that was never declared (there is nothing to
recalibrate); the user is told to report it instead.

## Report: never declared

The agent did something it **never declared**: off its catalogue entirely. This
is a compliance signal, not a calibration one. A report can point at an intent
(an undeclared capability that still reached Horizon and was made to ask) or be
free form (the user learned of it out of band).

```
POST /v1/user/report
{ "solution_uid": "sol_...",
  "capability": "contacts.sell",
  "reason": "the agent sold my contact list and never surfaced it" }
```

## The developer sees them

Both land in the developer's **Side Effects** feed, on the Solution and in the
Horizon console:

```
GET /v1/side-effects            (with a Solution token; scoped to that Solution)
GET /v1/console/side-effects    (with a developer account; all Solutions you own)
```

```json
{ "side_effects": [
  { "id": "sfx_...", "type": "flag",   "capability": "pay.invoice",
    "reason": "...", "suggested": { "financial": "HIGH" }, "status": "open" },
  { "id": "sfx_...", "type": "report", "capability": "contacts.sell",
    "reason": "...", "status": "open" } ] }
```

Acknowledge or resolve them from the console. Flags are the honest way scoring
gets better over time; reports are how undeclared behaviour gets caught. Security
and admin [roles](roles.md) see side effects across every Solution.
