# Scenarios

Four real-life scenarios, one per domain, each showing the same shape: an AI
agent does its routine work freely, and the **moments that matter** are recorded
and held for a person's approve / edit / deny. Each uses a different framework
adapter, so together they double as an adapter tour.

| File | Domain | Adapter | What flows / what is held |
|---|---|---|---|
| [`coding-agent.mjs`](coding-agent.mjs) | a coding agent | SDK / MCP | read, test, staging deploy flow; force-push + prod deploy are approved on the phone; dropping a table is refused |
| [`payments.mjs`](payments.mjs) | a finance assistant | OpenAI | categorizing flows; a small invoice + a known transfer are approved; a $50k invoice and a $9k transfer to a new payee are refused |
| [`support-refunds.mjs`](support-refunds.mjs) | a support bot | Anthropic | order lookup + replying flow; a $25 refund is approved; a $1,500 refund is refused |
| [`devops-infra.mjs`](devops-infra.mjs) | an SRE agent | Google Gemini | reading metrics flows; scale + restart are approved; deleting a namespace is refused (SEVERE) |

Every action - allowed or not - lands on Horizon's signed audit ledger.

## Run them

You need a Solution registered in Horizon (that gives you a `client_id` /
`client_secret`) and a person's email. Then:

```bash
export XURFACE_API_BASE=https://xurface.500xlaunch.com   # or your own Horizon
export XURFACE_CLIENT_ID=cli_...
export XURFACE_CLIENT_SECRET=xsk_...
export XURFACE_USER=you@company.com                       # the person deciding

node examples/scenarios/payments.mjs
node examples/scenarios/coding-agent.mjs
node examples/scenarios/support-refunds.mjs
node examples/scenarios/devops-infra.mjs
```

The scenarios import the SDK from `../../packages/sdk-typescript` so they run
straight from a checkout with no install. Node >= 18.

### About the "phone"

So the demos run unattended, each scenario **plays the person's Xurface Discern
phone** with a fixed policy (see `playPhone` in [`_harness.mjs`](_harness.mjs)) -
approving the reasonable actions, refusing the dangerous ones, and adding a
biometric where the action scores SEVERE. **In real life you remove that**: the
held actions arrive as push notifications on the person's device, and they tap
Approve / Edit / Deny. Everything else in the scenario is exactly what a real
agent does.

## The shape every scenario shares

```js
// declare once; Horizon scores each ability
await xf.declareAgent("finance-assistant", { abilities: [ /* ... */ ] });

// guard the action; it records, and holds it if the risk exceeds appetite
const verdict = await xf.guard({ user, agent: "finance-assistant",
  capability: "pay.invoice", details: { amount: 180 }, wait: 120000 });

if (verdict.allowed) reallyPay(verdict.details);   // details may be human-edited
```
