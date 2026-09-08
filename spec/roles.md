# Roles, Monitoring and Support

> Status: draft. License: Apache-2.0 (this repository).

Horizon is where all of it is watched and audited: every user, developer and
agent action. Access to that record is scoped by role, the way a cloud portal
scopes a subscription.

## The roles

| Role | Sees | Does |
|---|---|---|
| `admin` | everything | manages accounts and roles, everything below |
| `developer` | their own Solutions, their side effects and tickets | registers Solutions, downloads manifests, calibrates from side effects, opens tickets |
| `security` | all Solutions, all side effects, the full monitor and audit | oversight and review, opens tickets |
| `support` | all tickets | works and resolves tickets |

The first account created on a Horizon is the `admin`; everyone after is a
`developer` until an admin promotes them. Security and support are assigned by an
admin.

```
POST /v1/account/signup        { "email": "...", "name": "..." }   -> { token, account }
POST /v1/account/login         { "email": "..." }                  -> { token, account }
POST /v1/console/accounts/{id}/role   { "role": "security" }       (admin only)
```

## Monitoring and audit

Every event is a signed statement chained with a running hash, verifiable offline.
Security and admin read the live monitor across the whole platform:

```
GET /v1/console/monitor        (security or admin)
-> { audit_ok, solutions, users, links, intents, side_effects, recent: [ ...events ] }
```

Developers see the slice that is theirs: their Solutions, their intents, their
[side effects](side-effects.md).

## Support tickets

Developer and security raise tickets; support and admin work them. It behaves the
way an Azure-portal support request does: a category, a severity, a thread, a
status.

```
POST   /v1/console/tickets                { category, severity, subject, body, solution_uid? }
GET    /v1/console/tickets                 (your own, or all for security/support/admin)
POST   /v1/console/tickets/{id}/comment    { body }
POST   /v1/console/tickets/{id}/status     { status }   (support or admin)
```

Categories: `billing`, `technical`, `security`, `abuse`, `other`. Severities:
`low`, `medium`, `high`, `urgent`. Statuses: `open`, `in_progress`, `resolved`.
