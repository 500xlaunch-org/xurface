<p align="center">
  <a href="https://xurface.500xlaunch.com"><img src="https://raw.githubusercontent.com/500xlaunch-org/xurface/main/docs/assets/banner.png" alt="Xurface" width="100%"></a>
</p>

<h1 align="center">xurface</h1>

<p align="center"><b>Discernment for AI agents.</b><br/>Route the actions that matter to a human, in three calls.</p>

<p align="center">
  <a href="https://pypi.org/project/xurface/"><img alt="PyPI" src="https://img.shields.io/pypi/v/xurface?color=3B6EA3"></a>
  <img alt="downloads" src="https://img.shields.io/pypi/dm/xurface?color=60A5FA">
  <img alt="python" src="https://img.shields.io/pypi/pyversions/xurface?color=3776AB">
  <a href="https://github.com/500xlaunch-org/xurface/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-Apache_2.0-3B6EA3"></a>
  <a href="https://github.com/500xlaunch-org/xurface/blob/main/CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-22C55E"></a>
</p>

---

AI agents now act for people around the clock. They pay, publish, deploy and
delete. Passwords, passkeys and 2FA prove *who is calling*. They can't answer
*should this happen*. **Xurface is the layer that asks.**

You declare what your agent can do; Horizon scores the risk; the user's appetite
decides. Routine actions pass and are logged. The ones that matter are pushed to
the person's phone; they approve, deny or edit; your agent resumes with a signed,
audited decision. You never hard-code a threshold. Standard library only, Python 3.10+.

## Install

```bash
pip install xurface
```

## The whole integration

```python
from xurface import Xurface, XurfaceDenied

xf = Xurface.from_spec()                       # the manifest you downloaded from Horizon

# declare once: you name the abilities, Horizon scores their risk.
# developer_risk is optional and only ever raises a score.
xf.declare_agent("billing-bot", abilities=[
    {"key": "pay_invoice", "kind": "capability", "developer_risk": {"financial": "HIGH"}},
])

try:
    ok = xf.guard(user=user, agent="billing-bot",
                  capability="pay_invoice", details={"amount": 2400, "currency": "USD"})
    # ok["state"] is "allowed" or "approved"; ok["severity"]/["risk"]/["reasons"] say why
except XurfaceDenied:
    ...  # the person said no; deny always denies the whole sequence
```

`guard()` is evaluate → push → wait, in one: Horizon scores the action, reconciles
it with the user's appetite, and decides. Force-pushes, deploys, payments and
deletes now stop for a human when they should, and only when they should.

## What the person sees

<p align="center">
  <img src="https://raw.githubusercontent.com/500xlaunch-org/xurface/main/docs/assets/discern.png" alt="A Xurface Discern notification: the solution, the agent, the steps needing discernment, and Approve / Approve all / Deny" width="72%">
</p>

One inbox, **Xurface Discern**, for every agent from every vendor. Approve one
step, approve the whole sequence, or deny. Sequences and one-shot input requests
are built in. Their passwords, passkeys and 2FA never leave their control.

## Part of something bigger

This SDK is one tile of a two-sided network: **developers** bring agents,
**people** bring judgement, and the **Horizon** platform links the two and keeps
the record. Every agent you onboard gives people one more reason to carry the
app; every person makes your reach a little larger. More developers, more users.
More users, more developers.

For workflow frameworks, add a micro-SDK: `xurface-langgraph`, `xurface-crewai`,
`xurface-autogen` (landing in the [monorepo](https://github.com/500xlaunch-org/xurface)).

## Contributing

The highest-leverage thing you can build here is a micro-SDK that teaches one more
framework to route discernment. See
[CONTRIBUTING](https://github.com/500xlaunch-org/xurface/blob/main/CONTRIBUTING.md).
Don't miss being early to the layer every agent will need.

## Links

- **Site:** https://xurface.500xlaunch.com
- **Repo & spec:** https://github.com/500xlaunch-org/xurface
- **TypeScript SDK:** https://www.npmjs.com/package/@xurface/sdk

Apache-2.0 · a product of [500xLaunch](https://500xlaunch.com).
