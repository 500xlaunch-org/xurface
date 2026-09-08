<p align="center">
  <a href="https://xurface.500xlaunch.com"><img src="https://raw.githubusercontent.com/500xlaunch-org/xurface/main/docs/assets/banner.png" alt="Xurface" width="100%"></a>
</p>

<h1 align="center">create-xurface-sdk</h1>

<p align="center"><b>Scaffold a Xurface SDK in one command.</b><br/>Give your agents discernment — skills, tools or capabilities — from a downloaded Horizon manifest.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/create-xurface-sdk"><img alt="npm" src="https://img.shields.io/npm/v/create-xurface-sdk?color=3B6EA3&label=npm"></a>
  <img alt="downloads" src="https://img.shields.io/npm/dm/create-xurface-sdk?color=60A5FA">
  <a href="https://github.com/500xlaunch-org/xurface/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/badge/license-Apache_2.0-3B6EA3"></a>
  <a href="https://github.com/500xlaunch-org/xurface/blob/main/CONTRIBUTING.md"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-22C55E"></a>
</p>

---

**Xurface** is the discernment layer for AI agents: routine actions pass and are
logged, the ones that matter go to a person's phone. This tool generates a ready
project that wires your agents into it — no boilerplate to write.

## Use it

```bash
npx create-xurface-sdk@latest my-sdk --kind tools --lang ts --spec ./xurface-solution.json
```

- `--kind` &nbsp;`skills` · `tools` · `capabilities` — match how your agent works
- `--lang` &nbsp;`ts` · `py`
- `--spec` &nbsp;the `xurface-solution.json` you downloaded from the Horizon console

You get a project that already declares your agents, guards each consequential
action, and is ready to run and submit:

```
my-sdk/
├── xurface.yaml       your agents + abilities, criticity per ability
├── src/index.ts       declaration + guard() wired around each ability
├── skills/SKILL.md     (skills kind) instructions a coding agent can load
└── README.md
```

## What the person sees

<p align="center">
  <img src="https://raw.githubusercontent.com/500xlaunch-org/xurface/main/docs/assets/discern.png" alt="A Xurface Discern notification: the solution, the agent, the steps needing discernment, and Approve / Approve all / Deny" width="70%">
</p>

## Build the network

`create-xurface-sdk` is how the **meta-SDK** grows: scaffold a micro-SDK for a
new IDE or framework, then submit it to the
[registry](https://github.com/500xlaunch-org/xurface/blob/main/registry/index.json).
That is the highest-leverage contribution to Xurface — teach one more surface to
route discernment, and reach every person already carrying the app. Don't miss
being early to the layer every agent will need.

## Links

- **Site:** https://xurface.500xlaunch.com
- **Repo, spec & submitting:** https://github.com/500xlaunch-org/xurface
- **SDKs:** [`@xurface/sdk`](https://www.npmjs.com/package/@xurface/sdk) (TS) · [`xurface`](https://pypi.org/project/xurface/) (Python)

Apache-2.0 · a product of [500xLaunch](https://500xlaunch.com).
