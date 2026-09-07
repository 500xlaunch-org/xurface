# Rate Limits and Discernment Budgets

> Status: draft. License: Apache-2.0 (this repository).

Two protections, two different reasons. **Rate limits** protect the platform.
**Discernment budgets** protect the human. A person who is pinged forty times an
hour stops discerning and starts rubber-stamping; the budget exists so that never
happens.

## Layer 1: transport rate limits (per Solution, per agent)

Enforced on every API call, keyed by Solution and by agent within it. Defaults
come from the [manifest](solution-manifest.md) `limits` block:

| Limit | Default | Scope |
|---|---|---|
| `requests_per_minute` | 300 | Solution |
| `requests_per_minute_per_agent` | 60 | agent |
| `discovery_per_hour` | 100 | Solution |

Responses carry the standard headers on every call:

```
X-Xurface-Limit: 300
X-Xurface-Remaining: 287
X-Xurface-Reset: 1757251200
```

Exceeding a limit returns `429` with `Retry-After`. SDKs back off automatically.

## Layer 2: discernment budgets (per link)

Budgets cap how much human attention a Solution may ask for, per linked user:

| Budget | Default | Behaviour on overflow |
|---|---|---|
| `max_pending_per_link` | 5 | new pushable intents are queued, not pushed |
| `intents_per_link_per_hour` | 20 | `429` with `Retry-After` |
| `pushes_per_link_per_day` | 30 | intents queue for the next digest |

Rules of the budget:

- **SEVERE never digests.** It always pushes, but still counts against, and is
  capped by, the hourly limit.
- **Digest batching.** Below-threshold pressure is bundled: instead of ten pushes,
  the user gets one card with ten rows. Sequences (one card, many steps, one
  Approve all) are the agent's tool for the same courtesy; prefer one sequence
  over five separate intents.
- **The user turns the dial.** A user's "discernment appetite" can tighten any
  budget per Solution. Horizon may also tighten budgets for Solutions with poor
  approval ratios (asking often and being denied often is a signal).
- Budgets are visible to agents at `GET /v1/limits` and in the headers above, so a
  well-built agent paces itself instead of discovering the wall.

## Guidance for agents

1. Batch related questions into one sequence.
2. Ask at the moment of consequence, not at startup.
3. Cache decisions: "always allow this tool" style rules mean you stop asking.
4. Treat `429` as design feedback, not an obstacle.
