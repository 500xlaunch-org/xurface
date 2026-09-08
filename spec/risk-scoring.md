# Risk Scoring

> Status: draft. License: Apache-2.0 (this repository).

Developers declare what their agents can do. Horizon scores the risk. This is
what makes the model dynamic: no one hand-picks a criticity level per action and
hopes it is right. Scoring is explainable, standards-mapped, and the same for
every Solution.

## The taxonomy

Every ability, and every runtime action, is scored across these categories. Each
maps to an established control family so a security reviewer can trace it.

| Category | Covers | Maps to |
|---|---|---|
| `identity` | credentials, passkeys, 2FA, scopes, permissions, sign-in | NIST 800-63 (IAL/AAL), ISO/IEC 24760, NIST 800-53 IA/AC |
| `financial` | payments, transfers, trades, spend, billing | NIST 800-53 AC/AU, PCI-DSS, ISO/IEC 27001 A.5 |
| `location` | physical location and presence | NIST 800-53 PE, ISO/IEC 27701 |
| `intellectual` | source, documents, contracts, publishing, IP | ISO/IEC 27001 A.5.9/A.8, NIST 800-53 MP/SC |
| `conversation` | speaking for the person: send, reply, post, contact | NIST 800-53 SC, ISO/IEC 27701 |
| `data` | reading, exporting, sharing the person's data | NIST 800-53 AC/AU/MP, ISO/IEC 27001 A.8, GDPR Art.5 |
| `system` | deploy, delete, configure, revoke access | NIST 800-53 CM/AC/AU, ISO/IEC 27001 A.8.9 |

The public taxonomy is served at `GET /v1/risk/taxonomy`.

## Severity

Each category an ability touches gets a severity: `LOW`, `MEDIUM`, `HIGH`,
`SEVERE`. An ability's overall **severity is the maximum across its categories**.
`SEVERE` is special: it always requires discernment, always needs a biometric
assertion, and can never be delegated.

## How Horizon scores

Horizon reads the ability's key, kind, description and input schema, matches them
against verb-and-noun rules that assign category severities, and escalates by one
notch when the shape is bulk or irreversible (`all`, `mass`, `permanent`,
`production`). The rules are deliberately legible, not a black box.

```
scoreAbility("account.delete", "Delete the account permanently")
  -> { risk: { system: "SEVERE" }, severity: "SEVERE", source: "horizon" }

scoreAbility("offers.scan", "Scan inbox for job offers")
  -> { risk: { data: "MEDIUM" }, severity: "MEDIUM", source: "horizon" }
```

## Optional developer evaluation

You may attach your own `developer_risk` per ability, either a single severity or
a per-category map. It never lowers Horizon's score: Horizon holds its own score
as a **floor** and blends by taking the higher severity per category. So a
developer evaluation can sharpen or raise, never soften.

```
declare pay.invoice with developer_risk { financial: "HIGH", data: "MEDIUM" }
  Horizon floor: { financial: "HIGH" }
  effective:     { financial: "HIGH", data: "MEDIUM" }   source: "blended"
```

`source` in the response is `horizon` (you gave nothing, or nothing above the
floor), `developer` (unused when the floor already covers you), or `blended` (your
evaluation raised at least one category).

## Runtime

At runtime the action is scored the same way. A **declared** capability reuses
its stored score. An **undeclared** capability is scored on the fly and always
asks: the agent is acting off its own catalogue, and the user can
[report](side-effects.md) it. A sequence takes the max risk across its steps.

The scored action is then reconciled with the user's
[appetite](discernment-appetite.md).
