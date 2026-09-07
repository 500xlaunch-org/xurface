# The Xurface SDK Toolkit

Build an SDK for your Agentic Solution, then submit it so users and other
developers can find it. This is the create-and-submit path for the two-sided
market: every SDK submitted here gives users one more reason to carry Xurface
Discern, and every user makes your Solution's audience larger.

## The three SDK shapes

An SDK wraps your agent's abilities so each consequential one passes through
discernment. Pick the shape that matches how your agent works:

| Shape | What it wraps | Typical home |
|---|---|---|
| **skills-based** | prose instructions a model follows (a `SKILL.md` the agent reads) | coding agents in VS Code: Claude Code, GPT, Cursor |
| **tools-based** | callable functions/tools (MCP tools, function calling) | tool-using agents, MCP servers, workflow frameworks |
| **capabilities-based** | broader grants (connect Gmail, spend budget) that unlock groups of actions | on-device and long-running agents |

All three shapes rest on the same floor: the
[Solution Manifest](../spec/solution-manifest.md) for credentials, agent
[declaration](../spec/agent-onboarding.md),
[self-discovery](../spec/self-discovery.md) for the user, the three calls for
each action, and [rate limits](../spec/rate-limits.md) for pacing.

## Create

```bash
npx create-xurface-sdk my-solution-sdk \
  --kind tools \
  --lang ts \
  --spec ./xurface-solution.json
```

The scaffolder reads your downloaded manifest and generates:

```
my-solution-sdk/
├── xurface.yaml            # your agents + abilities, criticity per ability
├── src/index.ts            # declaration + guard() wired around each ability
├── skills/SKILL.md         # (skills kind) instructions an agent can load
├── xurface-solution.json   # NOT committed; .gitignore covers it
└── README.md
```

`--kind skills|tools|capabilities`, `--lang ts|py`. Run it again safely; it never
overwrites without `--force`.

## The flow your SDK implements

1. **Credentials.** The manifest's client id/secret become a short-lived token.
2. **Declare.** The agent declares itself (id, name, logo, description) and what
   it can do on behalf of the user. Horizon reports back the severity levels.
3. **Discover.** The agent finds the user's Xurface account from the id your
   product already has (email, phone, external id). The user does nothing but
   log in; their default email and phone self-discover automatically.
4. **Bridge and ask.** Guarded abilities raise intents; the user approves, denies
   or edits in Xurface Discern; rate limits and discernment budgets keep the
   user's attention safe.

## Submit

See [SUBMITTING.md](SUBMITTING.md). Short version: publish your package, add one
entry to [`registry/index.json`](../registry/index.json), open a pull request.
