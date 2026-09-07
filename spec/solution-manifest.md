# The Horizon Solution Manifest

> Status: draft. License: Apache-2.0 (this repository).

When a developer adds a **Solution** in the Horizon console, Horizon generates a
**Solution Manifest**: a single signed JSON file, `xurface-solution.json`, that the
developer downloads once and ships alongside their agents. It is everything an
agent needs to reach Horizon: identity, credentials, endpoints and limits.

The manifest is the root of trust on the developer side. Every SDK in this
repository, and every SDK built with the [toolkit](../toolkit/README.md), starts
from this file.

## Shape

```json
{
  "spec_version": "1.0",
  "solution": {
    "uid": "sol_01HXZ4Q8R2",
    "slug": "jobhunt-assistant",
    "name": "JobHunt Assistant",
    "description": "Finds relevant job offers and replies to the ones worth your time.",
    "icon": "https://cdn.xurface.dev/sol_01HXZ4Q8R2/icon.png",
    "publisher": { "org": "Acme Labs", "contact": "security@acme.dev" }
  },
  "auth": {
    "token_url": "https://xurface.500xlaunch.com/oauth/token",
    "client_id": "cli_01HXZ4Q8R2",
    "client_secret": "xsk_live_...",
    "audience": "sol_01HXZ4Q8R2"
  },
  "endpoints": {
    "api": "https://xurface.500xlaunch.com/v1",
    "mcp": "https://xurface.500xlaunch.com/mcp"
  },
  "user_ref": {
    "types": ["email", "phone", "external_id"],
    "namespace": "acme"
  },
  "limits": {
    "requests_per_minute": 300,
    "intents_per_link_per_hour": 20,
    "max_pending_per_link": 5
  },
  "credential_slots": ["mail.gmail"],
  "issued_at": "2026-09-07T12:00:00Z",
  "signature": "eyJhbGciOiJFUzI1NiJ9..."
}
```

## Field notes

- **`solution.uid`** is the Solution's unique id on Horizon. Together with a user
  reference it drives [self-discovery](self-discovery.md).
- **`auth`** carries OAuth-like client credentials. The agent exchanges them for a
  short-lived access token scoped to this Solution. Nothing else in the platform
  accepts the raw secret. Enterprise setups may replace `client_secret` with a
  registered public key and signed-JWT client authentication.
- **`user_ref.types`** declares which kinds of account id this Solution uses to
  refer to its users (email, phone, or an opaque `external_id` in the developer's
  own namespace). This is what Horizon matches against Xurface accounts.
- **`limits`** are the defaults granted to this Solution. Horizon enforces them
  server-side; SDKs surface them so agents can pace themselves. See
  [rate-limits.md](rate-limits.md).
- **`signature`** is Horizon's signature over the manifest, so SDKs can verify the
  file has not been tampered with.

## Handling rules

1. **The manifest is a secret.** It contains live credentials. Keep it out of
   version control, ship it via your secret store, and rotate it from the console
   if it leaks.
2. One manifest per Solution. Agents within the Solution share it; each agent still
   declares its own identity (see [agent-onboarding.md](agent-onboarding.md)).
3. SDKs accept the manifest as a file path or an object:
   `new Xurface({ specPath: "./xurface-solution.json" })`.
4. Manifests can be re-downloaded and re-issued at any time; `issued_at` and
   `signature` change, `solution.uid` never does.
