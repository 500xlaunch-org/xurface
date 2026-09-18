# xurface (Python)

Give your AI agents a **record** and a **conscience**, in one call.

[Xurface Horizon](https://xurface.500xlaunch.com) is the discernment checkpoint
an agent routes through before it takes a critical action on a person's behalf.
This SDK records every critical action on Horizon's signed audit ledger and, when
the risk exceeds what the person tolerates, holds it for their approve / edit /
deny in the Xurface Discern app - and the agent waits for the verdict.

Standard library only (urllib). Python >= 3.10.

## Install

```bash
pip install xurface
```

## Use

```python
from xurface import Xurface

xf = Xurface(client_id="cli_...", client_secret="xsk_...")   # Solution creds

xf.declare_agent("apply-bot", display_name="Apply Bot", abilities=[
    {"key": "offers.scan", "kind": "skill", "description": "Scan the inbox for job offers"},
    {"key": "pay.invoice", "kind": "capability", "description": "Pay an invoice",
     "developer_risk": {"financial": "HIGH"}},
])

user = xf.resolve_user("email", "ada@example.com")

verdict = xf.guard(user=user, agent="apply-bot", capability="pay.invoice",
                   details={"amount": 2400}, wait_ms=120000)   # block for a decision

if verdict.allowed:
    really_pay(verdict.details)        # details may be the person's edited values
else:
    print("not allowed:", verdict.state, verdict.reasons)
```

- within appetite -> `allowed` immediately, and logged;
- above appetite / SEVERE / developer `always` -> `held`, pushed to Discern;
  `guard(..., wait_ms=...)` blocks until the person decides;
- the person can **edit** the arguments before approving - they come back in
  `verdict.details`.

## Framework adapters

Each wraps a framework's tool abstraction so a held/denied action comes back as
an ordinary tool result the model can read:

```python
from xurface.adapters.openai import OpenAIGuard
from xurface.adapters.anthropic import AnthropicGuard
from xurface.adapters.gemini import GeminiGuard
from xurface.adapters.langgraph import guarded_tool        # LangChain / LangGraph
from xurface.adapters.crewai import guarded_crew_tool      # CrewAI
```

The LangGraph and CrewAI adapters return a real framework tool when the library
is installed, and a same-contract shim otherwise, so the guard integration is
identical either way.

**Add your framework** (~40 lines): copy `xurface/adapters/gemini.py`, make it
pass the contract test, open a PR. See the repo
[CONTRIBUTING.md](../../CONTRIBUTING.md).

## Test

```bash
python3 test/adapter_contract.py     # offline, no Horizon needed
```

Part of [Xurface](https://github.com/500xlaunch-org/xurface). A product of 500xLaunch.
