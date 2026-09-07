"""Xurface SDK for Python.

Manifest in, three calls out::

    from xurface import Xurface

    xf = Xurface.from_spec("./xurface-solution.json")
    xf.declare_agent("apply-bot", display_name="Apply Bot", abilities=[...])
    found = xf.discover_user("email", "ada@example.com")
    ok = xf.guard(user=found["user"], agent="apply-bot",
                  capability="reply.send", details={"to": "hr@corp.com"})

Standard library only (urllib). Python 3.10+. License: Apache-2.0.
"""

from .client import (
    Xurface,
    XurfaceError,
    XurfaceDenied,
    XurfaceRateLimited,
)

__all__ = ["Xurface", "XurfaceError", "XurfaceDenied", "XurfaceRateLimited"]
__version__ = "0.1.0"
