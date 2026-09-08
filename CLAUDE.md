# Xurface Agentic Resources (public SDK, spec, integrations)

This is the public, developer-facing repository for **Xurface**, the discernment
checkpoint between an AI agent's intent and its consequence. Product of 500xLaunch.
Flagship product of the portfolio (Dominion is second).

## The names (canonical)

- **Xurface** the product and brand.
- **Horizon** the platform where every agent surfaces its discernment intent. Weighs
  each action by severity, passes/logs/audits the routine ones, pushes the high-stakes
  ones to a human. Developers onboard their Agentic Solution INTO Horizon.
- **Xurface Discern** the mobile app where a person discerns: approves, denies or edits
  agent actions. One inbox for every agent from every vendor.
- **Xurface Agentic Resources** this repository.
- **Agentic Solution** the developer's product (an IDE, web app, mobile app, service)
  with its Agents and their skills, tools and capabilities.

## What this repo is

- `spec/` Discernment Event specification (Apache-2.0, like the whole repo)
- `packages/` TypeScript + Python SDKs, framework integrations, MCP helper
- `skills/` agent skill for requesting discernment
- `examples/` runnable examples
- `brand/` logo and marks (matte blue `#3B6EA3`, a wave that resolves into a ring)

## The product in one rule

The developer declares abilities; Horizon scores their risk; the user sets an
appetite. No fixed threshold, the user is the floor of protection:

```
if severity == SEVERE                              -> discern (biometric, never delegated)
elif developer policy == "always"                  -> discern
elif any category score exceeds the user appetite  -> discern
else                                               -> allow, mint token, log
```

Severity: LOW / MEDIUM / HIGH / SEVERE, the max across the risk categories an
action touches (identity, financial, location, intellectual, conversation, data,
systems; NIST/ISO mapped). A developer risk evaluation is optional and only ever
raises a score. After the fact a user can flag (declared but mis-scored) or report
(undeclared); developers see these. Platform roles: admin, developer, security,
support. See `spec/risk-scoring.md`, `spec/discernment-appetite.md`,
`spec/side-effects.md`, `spec/roles.md`.

## The three endpoints

`onXurface` (classify + evaluate), `pushXurface` (ping the phone),
`awaitXurface` (wait for the decision). Convenience wrapper: `xf.guard(...)`.

## Two-sided market

Developers bring Agentic Solutions; users bring identity, credentials and judgement;
Horizon links them. More developers, more users. More users, more developers. This
repo is the contribution point that feeds that loop.

## House rules

- Voice: plain, real, outcome-first. Say what it is.
- Never emit em dashes or en dashes in any output.
- Public repo: do not commit secrets, internal strategy, or business financials.
