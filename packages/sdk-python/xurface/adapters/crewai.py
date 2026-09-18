"""Xurface x CrewAI adapter.

CrewAI agents use tools that subclass `crewai.tools.BaseTool` and implement
`_run(**kwargs)`. This adapter wraps a callable as a Horizon-guarded CrewAI
tool: every use is recorded, and a use whose risk exceeds the person's appetite
is held for their discernment in Xurface Discern before the tool body runs. The
held / denied outcome comes back as the tool's string result, so the crew keeps
going and the agent can reason about not having been allowed.

If `crewai` is installed, `guarded_crew_tool(...)` returns a real BaseTool.
Otherwise it returns a lightweight object with the same `.name`, `.description`,
and `.run(**kwargs) -> str` contract, so the guard integration is exercised
identically in an offline test.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Dict, Optional

from .. import Xurface, run_guarded


def _guarded_call(xf: Xurface, ctx: Dict[str, Any], capability: str,
                  func: Callable[..., Any], args: Dict[str, Any]) -> str:
    out = run_guarded(xf, user=ctx["user"], agent=ctx["agent"], capability=capability,
                      exec_fn=lambda final: func(**final), args=args, wait_ms=ctx.get("wait_ms", 0))
    g = out["guard"]
    meta = {"xurface": {"state": g.state, "severity": g.severity, "intent": g.intent_id, "reasons": g.reasons}}
    if out["ok"]:
        return json.dumps({"ok": True, "result": out["result"], **meta})
    return json.dumps({"ok": False, "blocked": True, "reason": out["message"], **meta})


def guarded_crew_tool(xf: Xurface, ctx: Dict[str, Any], name: str, func: Callable[..., Any],
                      capability: Optional[str] = None, description: str = ""):
    """Wrap a callable as a Horizon-guarded CrewAI tool.

    ctx = {"user": xid, "agent": "agent-id", "wait_ms": 120000}
    """
    cap = capability or name

    try:  # real CrewAI, if present
        from crewai.tools import BaseTool

        class _GuardedTool(BaseTool):
            name: str = name
            description: str = description or f"{name} (guarded by Xurface Horizon)"

            def _run(self, **kwargs) -> str:
                return _guarded_call(xf, ctx, cap, func, kwargs)

        return _GuardedTool()
    except Exception:  # offline / not installed: same contract, no dependency
        return _ShimCrewTool(name, description or f"{name} (guarded by Xurface Horizon)",
                             lambda kwargs: _guarded_call(xf, ctx, cap, func, kwargs))


class _ShimCrewTool:
    """Minimal stand-in matching CrewAI's BaseTool contract (name/description/run)."""

    def __init__(self, name: str, description: str, run: Callable[[Dict[str, Any]], str]):
        self.name = name
        self.description = description
        self._run_fn = run

    def run(self, **kwargs) -> str:
        return self._run_fn(kwargs)
