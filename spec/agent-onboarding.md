# Agent Onboarding

> Status: draft. License: Apache-2.0 (this repository).

How an agent goes from a downloaded [Solution Manifest](solution-manifest.md) to
raising its first discernment. Four steps, all idempotent, all doable in code at
startup.

```
manifest -> credentials -> declare itself -> declare what it can do -> discover the user
```

## 1. Get credentials (OAuth-like)

Exchange the manifest's client credentials for a short-lived access token:

```
POST {auth.token_url}
{ "grant_type": "client_credentials",
  "client_id": "cli_01HXZ4Q8R2",
  "client_secret": "xsk_live_...",
  "audience": "sol_01HXZ4Q8R2" }

-> { "access_token": "...", "token_type": "Bearer", "expires_in": 900 }
```

Tokens are scoped to the Solution and expire in minutes. SDKs refresh them
transparently.

## 2. Declare itself

Every agent has its own identity inside the Solution. Users see agents as distinct
actors, so the declaration is user-facing:

```
PUT /v1/agents/{agent_id}
{ "name": "apply-bot",
  "display_name": "Apply Bot",
  "logo": "https://cdn.acme.dev/apply-bot.png",
  "description": "Finds relevant job offers and replies to the ones worth your time." }
```

`agent_id` is chosen by the developer and stable across restarts. Horizon assigns
the public id (`agt_...`) on first declaration.

## 3. Declare what it can do; Horizon scores the risk

The same endpoint carries the agent's abilities. An ability is a **skill**, a
**tool** or a **capability** (see the [toolkit](../toolkit/README.md) for the three
SDK shapes). You declare it. Only `key` and `kind` are required; a risk
evaluation is **optional**:

```
PUT /v1/agents/{agent_id}
{ ...identity...,
  "abilities": [
    { "key": "gmail.connect", "kind": "capability",
      "description": "Connect to Gmail (read)", "requires_auth": ["mail.gmail"] },
    { "key": "offers.scan",   "kind": "skill",
      "description": "Scan inbox for job offers" },
    { "key": "reply.draft",   "kind": "tool",
      "description": "Draft replies to good matches" },
    { "key": "reply.send",    "kind": "tool",
      "description": "Send the replies",
      "schema": { "type": "object", "properties": { "to": {"type":"string"} } },
      "discernment": "always" },
    { "key": "pay.invoice",   "kind": "capability",
      "description": "Pay an invoice",
      "developer_risk": { "financial": "HIGH" } }
  ] }
```

**Horizon scores every ability** against the [risk taxonomy](risk-scoring.md) and
returns the effective per-category risk, the severity (the max across
categories), and where the score came from. If you passed `developer_risk`,
Horizon holds its own score as a floor and blends by taking the higher severity
per category, so your evaluation can only raise:

```
-> { "agent": "agt_01H7Q3F8", "abilities": [
     { "key": "gmail.connect", "severity": "HIGH",   "risk": { "identity": "HIGH" },                 "risk_source": "horizon", "discernment": "auto" },
     { "key": "offers.scan",   "severity": "MEDIUM", "risk": { "data": "MEDIUM" },                   "risk_source": "horizon", "discernment": "auto" },
     { "key": "reply.draft",   "severity": "MEDIUM", "risk": { "intellectual": "MEDIUM" },           "risk_source": "horizon", "discernment": "auto" },
     { "key": "reply.send",    "severity": "MEDIUM", "risk": { "conversation": "MEDIUM" },           "risk_source": "horizon", "discernment": "always" },
     { "key": "pay.invoice",   "severity": "HIGH",   "risk": { "financial": "HIGH" },                "risk_source": "horizon", "discernment": "auto" } ] }
```

The scored severity is what users see, and what the runtime rule reconciles
against their [appetite](discernment-appetite.md). `discernment` is your
adjustment: `auto` lets Horizon decide, `always` forces a prompt, `never` asks to
suppress it (honoured only where the user's appetite already tolerates the
score). Re-declaring with a higher score notifies linked users.

## 4. Discover the user and bridge in

The agent knows the user only by the id the Solution uses for them (an email, a
phone number, an external id). Discovery turns that into a link:

```
POST /v1/discovery/users
{ "user_ref": { "type": "email", "value": "ada@example.com" } }
```

See [self-discovery.md](self-discovery.md) for matching, consent and what the
agent gets back. Once the link is active, the agent bridges in and raises intents
with the three calls (`onXurface`, `pushXurface`, `awaitXurface`), subject to the
Solution's [rate limits](rate-limits.md).

## Sequences and user input

An intent may carry a **sequence** of steps (one card, several actions). The user
may approve one step at a time, approve all, or deny, and deny always denies the
whole sequence. A step may also request **user input**; the typed answer is
returned to the agent in the decision. Xurface Discern is not a chat app; input
requests are for the rare step that needs a value only the user has.
