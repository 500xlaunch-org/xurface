# Activating Xurface

First-class targets, in order: coding agents in VS Code, workflow frameworks,
on-device agents. All of them run the same floor: manifest, declare, discover,
guard.

## 1. Coding agents in VS Code (Claude, GPT, and friends)

The fastest activation is the **skill**. It teaches the agent when to ask and
how, with no code changes to your project.

**Claude Code** (VS Code extension or CLI):

```bash
# in your project
mkdir -p .claude/skills/xurface
curl -o .claude/skills/xurface/SKILL.md \
  https://raw.githubusercontent.com/500xlaunch-org/xurface/main/skills/xurface/SKILL.md
export XURFACE_SOLUTION_SPEC=$HOME/.config/xurface/xurface-solution.json
```

Claude discovers the skill automatically and will route force-pushes, deploys,
deletions and spending through your phone.

**GPT / Cursor / other VS Code agents**: paste the same rules into the file your
agent reads (`AGENTS.md`, `.cursorrules`, a system prompt):

```md
Before any consequential action (send, publish, deploy, pay, delete, force-push,
credential change), request the user's discernment through Xurface:
load the manifest from XURFACE_SOLUTION_SPEC, declare yourself once, discover
the user by email, then call guard() from @xurface/sdk (or POST /v1/intents per
spec/openapi.yaml) and proceed only on allowed/approved. Deny denies the whole
sequence; never retry a denied action.
```

## 2. Workflow frameworks

Wrap the step boundary. Every framework has a place where a step is about to
execute; call `guard` there with the step's description as the details.

- **LangChain / LangGraph**: a callback or interrupt before tool execution;
  map your tools' `criticity` in `xurface.yaml` and guard the HIGH ones.
- **MCP tools**: serve your tools through a wrapper that calls `onXurface`
  before invoking the real tool. The Xurface MCP server (Horizon) does this
  hosting for you, so tools published there need zero integration code.
- **Queues / cron / CI**: guard the promote/deploy/pay step; the run parks on
  `awaitXurface` and resumes on the phone decision.

## 3. On-device agents

Agents that live with the user (phone, laptop, car, home) still ask through
Horizon, so the record is complete and thresholds are consistent. The Python and
TypeScript SDKs are dependency-free precisely so they embed anywhere. Push and
await work over plain HTTPS long-poll; no persistent connection is required.

## The user side, for your docs

Tell your users exactly this: install Xurface Discern, log in, done. Their
default email and phone self-discover your Solution automatically; they can also
search your Solution in the app and enter the id they use with you. They set one
threshold per Solution and change it whenever they like.
