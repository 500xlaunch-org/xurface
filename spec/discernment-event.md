# The Discernment Event

> Status: draft. License: Apache-2.0 (this repository).

A **Discernment Event** records a single moment where an AI agent's intended
action is weighed, and either allowed automatically or decided by a human. It is
the unit of the Xurface audit trail and the contract any framework can implement.

The platform that evaluates events and holds the record is **Horizon**. The human
decides in the **Xurface Discern** app. Developers onboard an **Agentic Solution**
into Horizon; the objects below are what that involves.

The model is dynamic. A developer declares what their agents can do; Horizon
scores the risk; the user sets an appetite; and at runtime Horizon reconciles the
three. Nobody hard-codes a threshold.

## Objects

### Solution
The concrete product a developer registers (an IDE, a web app, a mobile app),
with a name, icon, description, purpose, its agents and what they can do.

### Agent
Belongs to a Solution. Has its own identity (icon, name, description) and a list
of **abilities**. An ability is a skill, a tool or a capability the agent can
use. The developer declares it; Horizon scores it (see below). A developer may
attach an optional risk evaluation and adjust when an ability asks.

### Link
One user to one Solution, created by discovery and consent. Carries the user's
**discernment appetite**: how much they want to be asked, per risk category.

### Intent
Created by an agent at runtime: "capability C of agent A wants to do X for user
U." Carries the action details as a Rich Authorization Request object, the
**risk** Horizon scored for it, its **severity**, the **reasons** it was allowed
or pushed, a state, and, once decided, a signed decision and a short-lived token.

## Risk and severity

Horizon scores every ability, and every runtime action, against a standards-based
[risk taxonomy](risk-scoring.md): identity, financial, location, intellectual,
conversation, data, systems. Each category gets a severity:

| Severity | Meaning |
|---|---|
| `LOW` | read, search, list, summarize |
| `MEDIUM` | draft, small spend within budget, routine messaging |
| `HIGH` | send, publish, pay, deploy, connect a credential |
| `SEVERE` | delete, destroy, change access, move real money at scale |

An action's severity is the highest across the categories it touches. The
developer may declare their own evaluation, but Horizon holds its score as a
floor: a developer evaluation can only raise a category, never lower it.

## The rule

There is no fixed threshold. Horizon reconciles the scored action with the
user's [appetite](discernment-appetite.md) and the developer's per-ability
policy, with the user as the floor of protection:

```
if severity == SEVERE                              -> discern (biometric, never delegated)
elif developer policy == "always"                  -> discern
elif any category score exceeds the user appetite  -> discern
else                                               -> allow, mint token, log
```

`discern` means: push to the phone, wait for the human, log the decision.
`allow` still logs. A developer `never` is honoured only where the user's
appetite already tolerates the score. This is what "matched with the user as the
most required to satisfy" means.

## Decision claims

A decision token binds the decision to the intent and the agent:

- `xurface.intent` the intent id
- `xurface.decision` who decided, when, how (for example biometric), and any edits
- `xurface.severity` the severity that was evaluated
- audience bound to the capability resource, key-thumbprint bound to the agent

## Feedback

After the fact, a user can [flag](side-effects.md) a declared action that was
mis-scored or that ignored their appetite, or **report** an action the agent
never declared. Both surface to the developer and feed back into scoring.

## Audit

Every event, automatic or decided, is emitted as a signed statement and chained
with a running hash so the record can be verified independently and offline.
Horizon lets you monitor and audit all user, developer and agent actions,
scoped by [role](roles.md).

## Standards this maps to

Client ID Metadata Documents for identity, the Device Authorization Grant pattern
for linking, CIBA for push and wait, Rich Authorization Requests for the action
detail, DPoP and Resource Indicators for token hygiene, Token Exchange for
delegation chains, and Shared Signals / CAEP for revocation. The risk taxonomy
maps to NIST 800-53 / 800-63 and ISO/IEC 27001 / 27701 families. These are
implementation details; the event model above is the contract.
