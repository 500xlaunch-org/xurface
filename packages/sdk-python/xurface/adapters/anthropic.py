"""Xurface x Anthropic (Claude tool use) adapter - Python.

Claude returns `tool_use` content blocks; your app runs each tool and replies
with a `tool_result` block. This adapter records every tool use in Horizon and
holds the risky ones for the person's discernment in Xurface Discern before the
tool runs. A held / denied call becomes a `tool_result` marked as an error, so
Claude sees it could not act and can explain or wait.

Works with the `anthropic` SDK Messages API and the Claude Agent SDK tool loop.
The adapter does not call the model; it guards the tools.

Example
-------
    guard = AnthropicGuard(xf, user=xid, agent="narrator", wait_ms=120000)
    guard.register("broadcast", broadcast, capability="brief.broadcast",
                   description="Broadcast the brief to the team",
                   input_schema={"type": "object", "properties": {"to": {"type": "string"}}})
    # ... pass guard.anthropic_tools() in your messages.create request ...
    for block in message.content:
        if block.type == "tool_use":
            results.append(guard.dispatch(block))
"""

from __future__ import annotations

import json
from typing import Any, Callable, Dict, Optional

from .. import Xurface, run_guarded


class AnthropicGuard:
    def __init__(self, xf: Xurface, user: str, agent: str, wait_ms: int = 0):
        self.xf = xf
        self.ctx = {"user": user, "agent": agent, "wait_ms": wait_ms}
        self._tools: Dict[str, dict] = {}

    def register(self, name: str, func: Callable[..., Any], capability: Optional[str] = None,
                 description: str = "", input_schema: Optional[dict] = None) -> "AnthropicGuard":
        self._tools[name] = {"func": func, "capability": capability or name,
                             "description": description,
                             "input_schema": input_schema or {"type": "object", "properties": {}}}
        return self

    def anthropic_tools(self) -> list:
        return [{"name": n, "description": t["description"], "input_schema": t["input_schema"]}
                for n, t in self._tools.items()]

    def dispatch(self, block: Any) -> dict:
        """Guard + run one tool_use block (dict or SDK object). Returns a tool_result block."""
        name = _get(block, "name")
        block_id = _get(block, "id")
        args = _get(block, "input") or {}
        if not isinstance(args, dict):
            args = {}
        tool = self._tools.get(name)
        if not tool:
            return _result(block_id, {"error": f"unknown tool {name}"}, True)

        out = run_guarded(self.xf, user=self.ctx["user"], agent=self.ctx["agent"],
                          capability=tool["capability"],
                          exec_fn=lambda final: tool["func"](**final), args=args,
                          wait_ms=self.ctx["wait_ms"])
        g = out["guard"]
        meta = {"state": g.state, "severity": g.severity, "intent": g.intent_id, "reasons": g.reasons}
        if out["ok"]:
            return _result(block_id, {"ok": True, "result": out["result"], "xurface": meta}, False)
        return _result(block_id, {"ok": False, "blocked": True, "reason": out["message"], "xurface": meta}, True)


def _get(obj: Any, key: str) -> Any:
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _result(tool_use_id: str, payload: dict, is_error: bool) -> dict:
    return {"type": "tool_result", "tool_use_id": tool_use_id,
            "is_error": is_error, "content": json.dumps(payload)}
