# Xurface (public SDK, spec, integrations)

This is the public developer-facing repository for **Xurface**, the discernment
checkpoint between an AI agent's intent and its consequence. Product of
500xLaunch. Flagship product of the portfolio (Dominion is second).

## What this repo is

- `spec/` Discernment Event specification (Apache-2.0, like the whole repo)
- `packages/` TypeScript + Python SDKs, framework integrations, MCP helper
- `skills/` agent skill for requesting discernment
- `examples/` runnable examples
- `brand/` logo and marks (matte blue `#3B6EA3`, wave that resolves into a ring)

## The product in one rule

```
if intent.criticity <= link.threshold  -> allow, mint token, log
else                                    -> push to phone, wait, log decision
```

Criticity levels: LOW / MEDIUM / HIGH / SEVERE. SEVERE always pushes, requires a
biometric assertion, and can never be delegated.

## Domain model

A developer registers a **Solution** (the concrete product: IDE, web app, mobile
app, with a name, icon, description, purpose, actions and agents). Behind it sits
a **Horizon**, the discernment surface a user links to. Each **Agent** has its own
identity and capabilities. An agent returns to its Horizon for exactly two
reasons: a **discernment** on an action, or **credential access** from the vault.

## House rules

- Voice: plain, real, outcome-first. Say what it is.
- Never emit em dashes or en dashes in any output.
- Public repo: do not commit secrets, internal strategy, or business financials.

## The three endpoints

`onXurface` (classify + evaluate), `pushXurface` (ping the phone),
`awaitXurface` (wait for the decision). Convenience wrapper: `xf.guard(...)`.
