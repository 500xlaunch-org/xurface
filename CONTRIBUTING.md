# Contributing to Xurface

Thank you for being here. **Xurface Agentic Resources is a contribution point.**
The platform is a two-sided market: developers bring Agentic Solutions, users bring
their judgement, and Horizon links the two. Every integration, rule pack or skill
you add makes Horizon more useful to users, and a bigger user base is a bigger
audience for every developer. **More developers, more users. More users, more
developers.** Your contribution pushes that loop.

## Ways to contribute

- **Criticity rule packs** — verb to criticity mappings for a domain (billing,
  email, infrastructure, trading, calendaring, ...). The most useful first PR.
- **Framework and runtime integrations** — wire Xurface into another agent framework
  or SDK (Anthropic, OpenAI, Google, Mistral, NVIDIA, LangChain/LangGraph, ...).
- **Event transports** — new mechanisms for push and await (webhooks, queues, ...).
- **Skills** — an agent skill that teaches a model how to request discernment.
- **Examples** — runnable, end-to-end samples that a developer can copy.
- **The spec** — feedback and improvements to the Discernment Event model in
  [`spec/`](spec/discernment-event.md).
- **Translations and docs**.

## Before you start

- For anything non-trivial, **open an issue first** so we can align on approach.
  Look for issues labelled `good first issue` and `help wanted`.
- Keep pull requests focused and well described: what, why, and how you tested.
- Match the surrounding style. The spec in `spec/` aims to stay small and
  implementable by any framework, so changes there get extra discussion.

## Development

This repo is early; per-package setup lands in each package's own README as it
arrives. In general:

- Node 18+ for the TypeScript packages, Python 3.10+ for the Python SDK.
- Run the package's tests and linter before opening a PR.
- Do not commit secrets. Nothing in this repo should ever need one.

## Pull request checklist

- [ ] An issue exists (for non-trivial changes) and is linked.
- [ ] The change is focused and documented.
- [ ] Tests and linter pass.
- [ ] You have signed the CLA (see below).

## Legal

Contributions require signing a Contributor License Agreement (CLA), landing in
`CLA.md`. The company retains relicensing rights. By contributing you agree your
contributions are licensed under the repository's [LICENSE](LICENSE) (Apache-2.0).

## Code of conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). Be kind.

## Contact

`digital@500xlaunch.com` for anything, and see [SECURITY.md](SECURITY.md) for
vulnerabilities.
