# Self-Discovery

> Status: draft. License: Apache-2.0 (this repository).

Self-discovery is how a Solution's users and Xurface accounts find each other with
**no work from the user**. The user logs in to Xurface. That is it. The rest is
matching.

## The two sides

**Developer side.** The Solution refers to its users by whatever id it already
has: an email, a phone number, or an opaque `external_id` in its own namespace
(declared in the [manifest](solution-manifest.md)). An agent asks Horizon:

```
POST /v1/discovery/users
{ "user_ref": { "type": "email", "value": "ada@example.com" } }
```

**User side.** A Xurface account carries verified identifiers: the email and phone
from signup, plus any the user adds. **The default account email and phone are used
for self-discovery automatically.** The user can also add solutions by hand: search
the Solution in Xurface Discern, enter the account id they use there (email, phone,
id), done.

## Matching

Horizon matches `(solution.uid, user_ref)` against:

1. verified identifiers on Xurface accounts (hashed comparison, never raw), and
2. manual entries the user typed for that Solution.

Three outcomes:

| Outcome | Response | Meaning |
|---|---|---|
| `linked` | `{ "status": "linked", "user": "xid_9f3k...", "appetite": { "financial": "LOW", "conversation": "MEDIUM", ... } }` | An active link exists. Bridge in. |
| `pending` | `{ "status": "pending", "link": "lnk_..." }` | A match was found; a **link request** is now in the user's Discern inbox. Poll or await. |
| `none` | `{ "status": "none" }` | No match. Do not retry aggressively; rediscovery is rate limited. |

## Consent is the gate

A match is never silently a link. The first bridge is always a **link request
card** in Xurface Discern: the Solution's logo and name, the agents it brings, and
how the match was made ("matched by your email"). One tap approves. Pause and
revoke are always available per Solution.

## Pairwise ids

The `user` value returned to a Solution is a **pairwise pseudonymous id**
(`xid_...`), stable for that Solution only. Solutions never learn the user's
Xurface account id, other identifiers, or other solutions. Two Solutions cannot
join their users by comparing ids.

## Sync

Once linked:

- the agent raises intents against `xid_...` and the user's
  [appetite](discernment-appetite.md) applies,
- the user sees the Solution, its agents and abilities grouped by severity in
  Discern, with a per-category appetite control,
- revocation propagates immediately; discovery for a revoked link returns `none`.
