# Example: a coding agent that asks before it force-pushes

The canonical Xurface scenario: your coding agent works off GitHub while you are
away from the keyboard. Before it force-pushes, the call comes to your phone.

## Run

```bash
# 1. your Solution Manifest from the Horizon console
export XURFACE_SOLUTION_SPEC=./xurface-solution.json

# 2. run against your Horizon (or the local horizon-platform core)
node --experimental-strip-types agent.ts
```

With the local platform (`500xlaunch-org/horizon-platform`), seed a solution and
point the manifest's endpoints at `http://localhost:8787`; its README shows the
two curl calls.
