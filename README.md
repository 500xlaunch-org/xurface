<p align="center">
  <img src="brand/xurface-icon.svg" width="96" height="96" alt="Xurface" />
</p>

<h1 align="center">Xurface Agentic Resources</h1>

<p align="center">
  <b>AI Agent actions discernment, on the GO.</b><br/>
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
  <a href="#risk-and-appetite">Risk &amp; appetite</a> &nbsp;·&nbsp;
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
> open, right here. The Python SDK is live on PyPI (`pip install xurface`) and the
> npm packages are live (`npm i @xurface/sdk`, `npx create-xurface-sdk`). **This is
> a contribution point** and help is wanted, see [Contributing](#contributing).

## Contents

- [What is Xurface](#what-is-xurface)
- [Quickstart](#quickstart)
- [How it works](#how-it-works)
- [The Xurface SDK](#the-xurface-sdk)
- [The names](#the-names)
- [Risk and appetite](#risk-and-appetite)
- [What is in this repo](#what-is-in-this-repo)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Community and security](#community-and-security)
- [License](#license)

## What is Xurface

Three names to know: **Xurface** is the product. **Horizon** is the platform where
every agent surfaces its discernment intent. **Xurface Discern** is the phone app
where a person discerns: approves, denies or edits agent actions.

You do not hand-pick a threshold. The developer **declares** what an agent can do;
**Horizon scores** the risk of each action across a standards-based taxonomy; the
user sets a **discernment appetite**. At runtime Horizon reconciles the two, with
the user as the floor of protection. Routine actions pass and are logged; the ones
that exceed the appetite are pushed to the phone as an intent (what, who, how
much). You approve, deny or edit, and the agent resumes with a signed decision
written to an audit trail. If something still slips through, you flag or report
it, and the developer sees it.

## Quickstart

No boilerplate. The point of Xurface is that your coding agent or your workflow
gets discernment on the actions that matter from a config drop or a one-line
install, not a rewrite.

### In your IDE, for coding agents

Give the agent the Xurface skill and a manifest path; it guards the risky moves
(force-push, deploy, delete, spend) on its own.

- **VS Code / Claude Code** (works today):
  ```bash
  mkdir -p .claude/skills/xurface && curl -o .claude/skills/xurface/SKILL.md \
    https://raw.githubusercontent.com/500xlaunch-org/xurface/main/skills/xurface/SKILL.md
  export XURFACE_SOLUTION_SPEC=./xurface-solution.json
  ```
- **GitHub Codespaces / github.dev** and **Cursor**: the same skill, dropped by a
  micro-SDK (`npx create-xurface-sdk@latest add codespaces` / `add cursor`).
  Landing now, see [the meta-SDK](#the-xurface-sdk).

### In your workflow framework

One install, no glue. A micro-SDK wraps the step boundary so every high-stakes
tool call is guarded and every routine one is logged:

- **LangGraph** &mdash; `pip install xurface-langgraph` (interrupt before the guarded node)
- **CrewAI** &mdash; `pip install xurface-crewai` (a `@discern` tool decorator)
- **AutoGen** &mdash; `pip install xurface-autogen` (wrap an agent)

The framework micro-SDKs are landing in `packages/integrations/`; the core they
sit on is live today.

### By hand, if you prefer

```ts
const xf = Xurface.fromSpec();                    // the downloaded manifest
const ok = await xf.guard({ user, agent, capability, details });
// ok.state is "allowed" or "approved"; guard throws if the user denies
// ok.severity and ok.risk carry what Horizon scored and why
```

`guard` is evaluate, push and await in one: Horizon scores, reconciles with the
user's appetite, and decides. Python mirrors it.

## The Xurface SDK

"Get the SDK" is not one package, it is a **meta-SDK**: a tiny core plus a growing
family of **micro-SDKs** you add only where you need them.

```
@xurface/sdk (core)          the three calls, manifest, tokens
  + @xurface/vscode          IDE skill installers (VS Code, Codespaces, Cursor)
  + @xurface/langgraph       framework guards (LangGraph, CrewAI, AutoGen, ...)
  + @xurface/mcp             serve every capability as an MCP tool
  + your integration         add one, register it, ship it
```

Each micro-SDK is small, independent, and does one thing: teach one IDE or one
framework to route discernment through Horizon. That is the contribution point,
adding a micro-SDK is the highest-leverage PR here. Scaffold one with
`npx create-xurface-sdk@latest` and submit it to the [registry](registry/index.json).

## How it works

```
Developers  ->  Horizon  ->  Users
```

- **Developers** onboard an **Agentic Solution** into Horizon. Their Agents
  self-declare what they can do (skills, tools and capabilities). A developer risk
  evaluation is optional; where it is missing, **Horizon scores the risk** against
  a NIST/ISO-mapped taxonomy and returns what will need discernment.
- **Horizon** reconciles each action's score with the user's **appetite**, with the
  user as the floor of protection. Routine actions pass and are logged and audited;
  the ones that exceed the appetite wait for a human. Every decision is signed.
- **Users** get one inbox, **Xurface Discern**, for every agent from every vendor or
  developer. They approve, deny or edit from a phone, set how much they want to be
  asked, and can flag or report anything after the fact. Their means of arbitration
  and discernment stays theirs.

Horizon monitors and audits all user, developer and agent actions, with roles
(admin, developer, security, support) and support tickets. See
[`spec/roles.md`](spec/roles.md).

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

<a id="risk-and-appetite"></a>
## Risk and appetite

You declare abilities; Horizon scores them. Every ability, and every runtime
action, is scored across a standards-based taxonomy: **identity, financial,
location, intellectual, conversation, data, systems** (mapped to NIST 800-53 /
800-63 and ISO/IEC 27001 / 27701, see [`spec/risk-scoring.md`](spec/risk-scoring.md)).
Each category it touches gets a severity; the action's severity is the highest.

| Severity | Typical actions | Default behaviour |
|---|---|---|
| **Low** | read, search, list | passes, logged |
| **Medium** | draft, small spend within budget, routine messaging | passes, logged |
| **High** | send, publish, pay, deploy, connect a credential | waits for the human |
| **Severe** | delete, change access or credentials | waits, with biometric; never delegated |

There is no fixed threshold. The user's **discernment appetite** (per category, the
severity they will let pass) is the floor: a developer can ask for more discernment
than the appetite, never quietly less. A developer risk evaluation can only raise a
score, never lower it. See [`spec/discernment-appetite.md`](spec/discernment-appetite.md).

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
- [x] Risk scoring (NIST/ISO taxonomy), discernment appetite, flag/report side effects
- [x] Platform roles (admin, developer, security, support) + support tickets
- [ ] MCP server helper and example tools server
- [ ] Framework integrations: Anthropic, OpenAI, Google, Mistral, NVIDIA, LangChain
- [ ] Community risk rule packs (calibrate the scorer for a domain)
- [ ] Translations

## Contributing

**This repository is a contribution point.** Xurface gets better the more the
ecosystem builds on it, and the loop above means every good contribution reaches
more people.

Great first contributions:

- **Risk rule packs**: verb-and-noun to category/severity mappings that calibrate
  Horizon's scorer for a domain (billing, email, infra, trading, ...).
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
