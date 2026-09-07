# The Discernment Event

> Status: draft. License: Apache-2.0 (this repository).

A **Discernment Event** records a single moment where an AI agent's intended
action is weighed, and either allowed automatically or decided by a human. It is
the unit of the Xurface audit trail and the contract any framework can implement.

## Objects

### Solution
The concrete product a developer registers (an IDE, a web app, a mobile app),
with a name, icon, description, purpose, its actions, and its agents.

### Agent
Belongs to a Solution. Has its own identity (icon, name, description) and a list
of capabilities. A capability is a tool or skill the agent manipulates, carrying
a declared criticity and, optionally, the credential slots it may need.

### Link
One user to one Solution, created by scanning a QR code or entering a short code.
Carries the user's delegation threshold and any narrower rules.

### Intent
Created by an agent at runtime: "capability C of agent A wants to do X for user
U." Carries the action details as a Rich Authorization Request object, a state,
and, once decided, a signed decision and a short-lived token.

## Criticity

| Level | Meaning | Behaviour |
|---|---|---|
| `LOW` | read, search, list, summarize | auto-allow, logged |
| `MEDIUM` | draft, small spend within budget | auto-allow within budget, logged |
| `HIGH` | send, publish, pay above a threshold | push, wait for a human |
| `SEVERE` | delete, change access or credentials | push, biometric, never delegated |

## The one rule

```
if intent.criticity <= link.threshold  -> allow, mint token, log
else                                    -> push, wait, log the decision
```

## Decision claims

A decision token binds the decision to the intent and the agent:

- `xurface.intent` the intent id
- `xurface.decision` who decided, when, how (for example biometric), and any edits
- `xurface.criticity` the level that was evaluated
- audience bound to the capability resource, key-thumbprint bound to the agent

## Audit

Every event, automatic or decided, is emitted as a signed statement and chained
with a running hash so the record can be verified independently and offline.

## Standards this maps to

Client ID Metadata Documents for identity, the Device Authorization Grant pattern
for linking, CIBA for push and wait, Rich Authorization Requests for the action
detail, DPoP and Resource Indicators for token hygiene, Token Exchange for
delegation chains, and Shared Signals / CAEP for revocation. These are
implementation details; the event model above is the contract.
