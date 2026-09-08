# Discernment Appetite

> Status: draft. License: Apache-2.0 (this repository).

The developer declares abilities; Horizon scores them; but the person decides how
much they want to be asked. That is their **discernment appetite**: per risk
[category](risk-scoring.md), the highest severity that may pass automatically.
Anything above it is pushed to Xurface Discern.

The appetite lives on the Link (one per Solution) and is shared with Horizon and,
through the intent responses, with the agents. The user may leave the default.

## Shape

```json
{
  "identity": "LOW",
  "financial": "LOW",
  "location": "MEDIUM",
  "intellectual": "LOW",
  "conversation": "MEDIUM",
  "data": "MEDIUM",
  "system": "LOW"
}
```

Read it as "for financial actions, anything above LOW asks me." The default above
is conservative: routine data, messaging and location pass; anything touching
identity, money, IP or systems asks once it is more than trivial.

Set or adjust it:

```
POST /v1/user/links/{link_id}/appetite
{ "appetite": { "financial": "HIGH" } }     // loosen: let ordinary payments through
```

## Reconciliation: the user is the floor

At runtime Horizon has three inputs: the action's score, the developer's
per-ability policy, and the user's appetite. It reconciles them with the **user
as the floor of protection**:

```
if severity == SEVERE                              -> discern   (never delegated, biometric)
elif developer policy == "always"                  -> discern
elif any category score > appetite[category]       -> discern   (the user floor)
else                                               -> allow
```

A developer can always ask for **more** discernment than the user's appetite
(`discernment: "always"`, or a higher `developer_risk`). A developer can never
quietly ask for **less**: `discernment: "never"` is honoured only where the
appetite already tolerates the score. This is what "matched with the user as the
most required to satisfy" means, made concrete.

## Worked example

`pay.invoice` scores `{ financial: HIGH }`.

- Default appetite `financial: LOW` -> `HIGH > LOW` -> **discern**. The card
  reaches the phone with the reason "Financial scored HIGH, above your LOW
  appetite."
- The user loosens to `financial: HIGH` -> `HIGH > HIGH` is false -> **allow**.
  The same call now passes and is logged.
- The user later feels a payment slipped through that should not have ->
  they [flag](side-effects.md) it, and the developer sees the calibration signal.
