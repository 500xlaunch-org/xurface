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

## 3. Declare what it can do on behalf of the user

The same endpoint carries the agent's abilities. An ability is a **skill**, a
**tool** or a **capability** (see the [toolkit](../toolkit/README.md) for the three
SDK shapes), each with a proposed criticity:

```
PUT /v1/agents/{agent_id}
{ ...identity...,
  "abilities": [
    { "key": "gmail.connect",  "kind": "capability", "criticity": "HIGH",
      "description": "Connect to Gmail (read)", "requires_auth": ["mail.gmail"] },
    { "key": "offers.scan",    "kind": "skill",      "criticity": "LOW",
      "description": "Scan inbox for job offers" },
    { "key": "reply.draft",    "kind": "tool",       "criticity": "MEDIUM",
      "description": "Draft replies to good matches" },
    { "key": "reply.send",     "kind": "tool",       "criticity": "HIGH",
      "description": "Send the replies",
      "schema": { "type": "object", "properties": { "to": {"type":"string"} } } }
  ] }
```

**Horizon reports back the severity levels.** The platform normalizes each
proposed criticity against its verb rules and the Solution's category, and the
response carries the effective values:

```
-> { "agent": "agt_01H7Q3F8", "abilities": [
     { "key": "gmail.connect", "criticity": "HIGH",   "status": "accepted" },
     { "key": "offers.scan",   "criticity": "LOW",    "status": "accepted" },
     { "key": "reply.draft",   "criticity": "MEDIUM", "status": "accepted" },
     { "key": "reply.send",    "criticity": "HIGH",   "status": "raised" } ] }
```

The effective criticity is what users see, and what the
[one runtime rule](discernment-event.md) evaluates. Raising an ability's criticity
after publication notifies linked users.

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
