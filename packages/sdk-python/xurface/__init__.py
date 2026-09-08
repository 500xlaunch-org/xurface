"""Xurface SDK for Python.

You declare what your agents can do; Horizon scores the risk; the user's
appetite decides what needs discernment::

    from xurface import Xurface

    xf = Xurface.from_spec("./xurface-solution.json")
    # self-declare: developer_risk per ability is OPTIONAL
    xf.declare_agent("apply-bot", display_name="Apply Bot", abilities=[
        {"key": "offers.scan", "kind": "skill"},
        {"key": "pay.invoice", "kind": "capability", "developer_risk": {"financial": "HIGH"}},
    ])
    found = xf.discover_user("email", "ada@example.com")
    ok = xf.guard(user=found["user"], agent="apply-bot",
                  capability="pay.invoice", details={"amount": 2400})

Standard library only (urllib). Python 3.10+. License: Apache-2.0.
"""

from .client import (
    Xurface,
    XurfaceError,
    XurfaceDenied,
    XurfaceRateLimited,
)

__all__ = ["Xurface", "XurfaceError", "XurfaceDenied", "XurfaceRateLimited"]
__version__ = "0.1.2"
