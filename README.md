<p align="center">
  <img src="brand/xurface-icon.svg" width="96" height="96" alt="Xurface" />
</p>

<h1 align="center">Xurface Agentic Resources</h1>

<p align="center">
  <b>AI agent action moderation, on the go.</b><br/>
  <i>Beyond human in the loop. Human on the go.</i>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: Apache 2.0" src="https://img.shields.io/badge/License-Apache_2.0-3B6EA3.svg"></a>
  <a href="CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-22C55E.svg"></a>
  <a href="#status"><img alt="Status: early" src="https://img.shields.io/badge/status-early-F59E0B.svg"></a>
  <a href="spec/discernment-event.md"><img alt="Spec: Discernment Event" src="https://img.shields.io/badge/spec-Discernment_Event-60A5FA.svg"></a>
  <a href="CODE_OF_CONDUCT.md"><img alt="Contributor Covenant" src="https://img.shields.io/badge/contributor-covenant-8B5CF6.svg"></a>
</p>

<p align="center">
  <a href="#what-is-xurface">What</a> &nbsp;·&nbsp;
  <a href="#quickstart">Quickstart</a> &nbsp;·&nbsp;
  <a href="#how-it-works">How it works</a> &nbsp;·&nbsp;
  <a href="#criticity">Criticity</a> &nbsp;·&nbsp;
  <a href="#contributing">Contributing</a> &nbsp;·&nbsp;
  <a href="spec/discernment-event.md">Spec</a>
</p>

---

AI agents now act on our behalf around the clock. They pay, publish, deploy and
delete. Passwords, passkeys and 2FA answer *"who is this?"*. They cannot answer
*"should this happen?"*.

**Xurface is the discernment checkpoint between an agent's intent and its
consequence.** This repository, **Xurface Agentic Resources**, is the open,
developer-facing side of it: the SDKs, the Discernment Event specification, agent
skills, and framework integrations that any developer, or coding agent, can read,
use and extend.

<a id="status"></a>
> **Status: early, and moving fast.** The SDKs and integrations are landing in the
> open, right here. The Python SDK is live on PyPI (`pip install xurface`); the npm
> packages (`@xurface/sdk`, `create-xurface-sdk`) are landing next. **This is a contribution point** and help is wanted,
> see [Contributing](#contributing).

## Contents

- [What is Xurface](#what-is-xurface)
- [Quickstart](#quickstart)
- [How it works](#how-it-works)
- [The names](#the-names)
- [Criticity](#criticity)
- [What is in this repo](#what-is-in-this-repo)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Community and security](#community-and-security)
- [License](#license)

## What is Xurface

Three names to know: **Xurface** is the product. **Horizon** is the platform every
agent routes through. **Xurface Discern** is the phone app where a person approves,
denies or edits.

Every agent action is classified by criticity. Below your delegation threshold it
passes automatically and is logged. Above it, it is pushed to your phone as an
intent: what, who, how much. You approve, deny or edit, and the agent resumes with
a signed decision written to an audit trail.

## Quickstart

Framework and skill agnostic. Three calls, or nothing at all if your tools run
through the Xurface MCP server.

```ts
import { Xurface } from "@xurface/sdk";

const xf = new Xurface({ solution: "acme-billing", key: process.env.XURFACE_KEY });

// classify the action, then decide
const risk = await xf.onXurface({
  user, agent: "billing-bot",
  capability: "pay_invoice",
  details: { amount: 2400, currency: "USD", payee: "Supplier Co" }
});
if (risk.state === "allowed") return execute(risk.token);

await xf.pushXurface(risk.id);                 // ping the phone
const ok = await xf.awaitXurface(risk.id);     // wait for a human
if (ok.state === "approved") return execute(ok.token, ok.editedDetails);
```

Python mirrors the same surface. Prefer one call? `xf.guard(capability, details, fn)`
wraps classify, push and await.

## How it works

```
Developers  ->  Horizon  ->  Users
```

- **Developers** onboard an **Agentic Solution** into Horizon. Their Agents disclose
  what they can do (skills, tools and capabilities). Horizon reports back the
  severity levels.
- **Horizon** weighs every action by its severity. Routine actions pass and are
  logged and audited. High-stakes ones wait for a human. Every decision is signed.
- **Users** get one inbox, **Xurface Discern**, for every agent from every vendor or
  developer. They approve, deny or edit from a phone. Their means of arbitration and
  discernment stays theirs.

### A two-sided market that compounds

Developers bring Agentic Solutions that ask for discernment. Users bring their
identity, their credentials and their judgement. Horizon links the two and keeps the
record.

Every developer who onboards gives users one more reason to carry Xurface Discern,
and every user makes the audience a developer can reach a little larger.

> **More developers, more users. More users, more developers.**

Contributing here, an integration, a rule pack, a skill, is how you push that loop.

## The names

| Name | What it is |
|---|---|
| **Xurface** | The product and the brand. |
| **Horizon** | The platform. The bridge every agent routes through; weighs each action, passes/logs/audits the routine ones, pushes the high-stakes ones to a human. |
| **Xurface Discern** | The phone app. One inbox for every agent from every vendor. |
| **Xurface Agentic Resources** | This repository. The open SDKs, spec, skills and integrations. |
| **Agentic Solution** | What a developer registers and onboards into Horizon (an IDE, a web app, a mobile app, a service) with its Agents and their capabilities. |
| **Discernment Event** | The signed record of one moment where an action was weighed and either auto-allowed or decided by a human. See [`spec/`](spec/discernment-event.md). |

## Criticity

The developer proposes, the user always sees the final tag.

| Level | Typical actions | Behaviour |
|---|---|---|
| **Low** | read, search, list | passes, logged |
| **Medium** | draft, small spend within budget | passes in budget, logged |
| **High** | send, publish, pay above a threshold | waits for the human |
| **Severe** | delete, change access or credentials | waits, with biometric; never delegated |

## What is in this repo

```
xurface/
├── spec/           the specifications: Discernment Event, Solution Manifest,
│                   agent onboarding, self-discovery, rate limits, OpenAPI
├── packages/
│   ├── sdk-typescript/   @xurface/sdk (zero-dep, Node 18+)
│   └── sdk-python/       xurface (stdlib only, Python 3.10+)
├── toolkit/        create-xurface-sdk scaffolder + how to submit an SDK
├── registry/       the public SDK registry (add yours by PR)
├── skills/         the VS Code skill for coding agents (Claude, GPT, ...)
├── integrations/   activation guides: VS Code, workflow frameworks, on-device
├── examples/       runnable end-to-end examples
└── brand/          logo and marks
```

Fastest activation for a coding agent in VS Code: drop
[`skills/xurface/SKILL.md`](skills/xurface/SKILL.md) into `.claude/skills/xurface/`
and set `XURFACE_SOLUTION_SPEC`. Details in
[`integrations/`](integrations/README.md).

## Roadmap

- [x] Specs: Discernment Event, Solution Manifest, agent onboarding,
      self-discovery, rate limits and discernment budgets, OpenAPI (draft)
- [x] TypeScript SDK (`declareAgent` / `discoverUser` / `onXurface` / `pushXurface` / `awaitXurface` / `guard`)
- [x] Python SDK (same surface)
- [x] SDK toolkit: `create-xurface-sdk` (skills / tools / capabilities) + registry + submission path
- [x] VS Code skill for coding agents (Claude, GPT, ...)
- [ ] MCP server helper and example tools server
- [ ] Framework integrations: Anthropic, OpenAI, Google, Mistral, NVIDIA, LangChain
- [ ] Community criticity rule packs
- [ ] Translations

## Contributing

**This repository is a contribution point.** Xurface gets better the more the
ecosystem builds on it, and the loop above means every good contribution reaches
more people.

Great first contributions:

- **Criticity rule packs**: verb to criticity mappings for a domain (billing, email,
  infra, trading, ...).
- **Framework and runtime integrations**: wire Xurface into another agent framework.
- **Event transports**: new mechanisms for push and await.
- **Examples and skills**: end-to-end samples, or an agent skill for requesting
  discernment.
- **Spec feedback and translations**.

How to start:

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
2. Open an issue to discuss anything non-trivial (look for `good first issue`).
3. Send a focused pull request. Contributions require signing the CLA (landing in
   `CLA.md`).

## Community and security

- Questions or ideas: `digital@500xlaunch.com`
- Security issues: please follow [SECURITY.md](SECURITY.md), do not open a public
  issue for vulnerabilities.
- If Xurface is useful to you, a star helps other developers find it.

## License

Apache-2.0. The interface is open on purpose: use it, implement it, extend it, with
an explicit patent grant for anyone building on the protocol. The running service
(the Horizon platform, its infrastructure and the app) is separate and not part of
this repository. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Xurface is a product of [500xLaunch](https://500xlaunch.com).
