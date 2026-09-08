<p align="center">
  <a href="https://xurface.500xlaunch.com"><img src="https://raw.githubusercontent.com/500xlaunch-org/xurface/main/docs/assets/banner.png" alt="Xurface" width="100%"></a>
</p>

<h1 align="center">@xurface/sdk</h1>

<p align="center"><b>Discernment for AI agents.</b><br/>Route the actions that matter to a human, in three calls.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@xurface/sdk"><img alt="npm" src="https://img.shields.io/npm/v/@xurface/sdk?color=3B6EA3&label=npm"></a>
  <img alt="downloads" src="https://img.shields.io/npm/dm/@xurface/sdk?color=60A5FA">
  <a href="https://pypi.org/project/xurface/"><img alt="python" src="https://img.shields.io/badge/python-xurface-3776AB?logo=pypi&logoColor=white"></a>
  <a href="https://github.com/500xlaunch-org/xurface/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-Apache_2.0-3B6EA3"></a>
  <a href="https://github.com/500xlaunch-org/xurface/blob/main/CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-22C55E"></a>
</p>

---

AI agents now act for people around the clock. They pay, publish, deploy and
delete. Passwords, passkeys and 2FA prove *who is calling* — they can't answer
*should this happen*. **Xurface is the layer that asks.**

Your agent classifies each action. Routine ones pass and are logged. The ones
that matter are pushed to the person's phone; they approve, deny or edit; your
agent resumes with a signed, audited decision. Zero dependencies, Node 18+.

## Install

```bash
npm i @xurface/sdk
```

## The whole integration

```ts
import { Xurface } from "@xurface/sdk";

const xf = Xurface.fromSpec();                 // the manifest you downloaded from Horizon
const ok = await xf.guard({ user, agent: "billing-bot",
  capability: "pay_invoice", details: { amount: 2400, currency: "USD" } });
// ok.state is "allowed" or "approved" — guard() throws if the person denies
```

`guard()` is classify → push → wait, in one. That's it. Force-pushes, deploys,
payments and deletes now stop for a human when they should, and only when they
should.

## What the person sees

<p align="center">
  <img src="https://raw.githubusercontent.com/500xlaunch-org/xurface/main/docs/assets/discern.png" alt="A Xurface Discern notification: the solution, the agent, the steps needing discernment, and Approve / Approve all / Deny" width="72%">
</p>

One inbox — **Xurface Discern** — for every agent from every vendor. Approve one
step, approve the whole sequence, or deny. Sequences and one-shot input requests
are built in. Their passwords, passkeys and 2FA never leave their control.

## Part of something bigger

This SDK is one tile of a two-sided network: **developers** bring agents,
**people** bring judgement, and the **Horizon** platform links the two and keeps
the record. Every agent you onboard gives people one more reason to carry the
app; every person makes your reach a little larger. More developers, more users.
More users, more developers.

`@xurface/sdk` is the core of a **meta-SDK** — add micro-SDKs only where you need
them (`@xurface/langgraph`, `@xurface/vscode`, `@xurface/mcp`, ...). See the
[monorepo](https://github.com/500xlaunch-org/xurface).

## Contributing

The highest-leverage thing you can build here is a micro-SDK that teaches one more
IDE or framework to route discernment. Scaffold one with
`npx create-xurface-sdk@latest`, and see
[CONTRIBUTING](https://github.com/500xlaunch-org/xurface/blob/main/CONTRIBUTING.md).
Don't miss being early to the layer every agent will need.

## Links

- **Site:** https://xurface.500xlaunch.com
- **Repo & spec:** https://github.com/500xlaunch-org/xurface
- **Python SDK:** https://pypi.org/project/xurface/

Apache-2.0 · a product of [500xLaunch](https://500xlaunch.com).
