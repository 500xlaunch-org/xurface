"""Xurface x LangChain / LangGraph adapter.

LangGraph agents act through LangChain tools: a ToolNode invokes a tool with the
arguments the model chose. This adapter wraps a tool so that every invocation is
recorded in Horizon and the risky ones are held for the person's discernment in
Xurface Discern before the tool body runs. A held or denied call returns a plain
string the model can read, so the graph keeps flowing instead of crashing.

If `langchain_core` is installed, `guarded_tool(...)` returns a real
`StructuredTool` you can drop straight into a ToolNode / `create_react_agent`.
If it is not installed (as in an offline test), it returns a lightweight object
with the same `.name`, `.description`, and `.invoke(dict) -> str` contract, so
the guard integration is exercised identically.
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


def guarded_tool(xf: Xurface, ctx: Dict[str, Any], name: str, func: Callable[..., Any],
                 capability: Optional[str] = None, description: str = "",
                 args_schema: Any = None):
    """Wrap a callable as a Horizon-guarded LangChain tool.

    ctx = {"user": xid, "agent": "agent-id", "wait_ms": 120000}
    """
    cap = capability or name

    try:  # real LangChain, if present
        from langchain_core.tools import StructuredTool

        def _run(**kwargs):
            return _guarded_call(xf, ctx, cap, func, kwargs)

        return StructuredTool.from_function(
            func=_run, name=name, description=description, args_schema=args_schema)
    except Exception:  # offline / not installed: same contract, no dependency
        return _ShimTool(name, description, lambda kwargs: _guarded_call(xf, ctx, cap, func, kwargs))


class _ShimTool:
    """Minimal stand-in matching LangChain's tool contract (name/description/invoke)."""

    def __init__(self, name: str, description: str, run: Callable[[Dict[str, Any]], str]):
        self.name = name
        self.description = description
        self._run = run

    def invoke(self, args: Dict[str, Any]) -> str:
        if not isinstance(args, dict):
            args = {"input": args}
        return self._run(args)

    # LangGraph's ToolNode also accepts a __call__ / run in some paths
    def run(self, args: Dict[str, Any]) -> str:
        return self.invoke(args)
