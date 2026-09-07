# xurface (Python)

Discernment for AI agents. Manifest in, three calls out. Standard library only,
Python 3.10+.

```python
from xurface import Xurface, XurfaceDenied

xf = Xurface.from_spec("./xurface-solution.json")  # or XURFACE_SOLUTION_SPEC env var

xf.declare_agent(
    "apply-bot",
    display_name="Apply Bot",
    description="Finds relevant job offers and replies to the ones worth your time.",
    abilities=[
        {"key": "gmail.connect", "kind": "capability", "criticity": "HIGH",
         "requires_auth": ["mail.gmail"]},
        {"key": "offers.scan", "kind": "skill", "criticity": "LOW"},
        {"key": "reply.send", "kind": "tool", "criticity": "HIGH"},
    ],
)

found = xf.discover_user("email", "ada@example.com")
if found["status"] == "none":
    raise SystemExit("user not on Xurface yet")

try:
    ok = xf.guard(user=found["user"], agent="apply-bot",
                  capability="reply.send", details={"to": "hr@corp.com"})
except XurfaceDenied:
    ...  # the user said no; deny always denies the whole sequence
```

Not on PyPI yet (early): `pip install git+https://github.com/500xlaunch-org/xurface#subdirectory=packages/sdk-python`.
