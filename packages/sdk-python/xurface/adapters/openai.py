"""Xurface x OpenAI (function / tool calling) adapter - Python.

OpenAI models return `tool_calls`; your app runs each tool by name and returns a
tool message. This adapter inserts Horizon between the model's request and the
real tool body: every call is recorded, and a call whose risk exceeds the
person's appetite is held for their discernment in Xurface Discern before the
tool runs. A held / denied call comes back as an ordinary tool message.

Works with the `openai` SDK and the Agents SDK - anywhere you dispatch
`tool_calls`. The adapter does not call OpenAI; it guards the tools.

Example
-------
    guard = OpenAIGuard(xf, user=xid, agent="apply-bot", wait_ms=120000)
    guard.register("send_reply", send_reply, capability="reply.send",
                   description="Email a recruiter back",
                   parameters={"type": "object", "properties": {"to": {"type": "string"}}})
    # ... pass guard.openai_tools() in your chat.completions request ...
    for call in message.tool_calls:
        tool_messages.append(guard.dispatch(call))
"""

from __future__ import annotations

import json
from typing import Any, Callable, Dict, Optional

from .. import Xurface, run_guarded


class OpenAIGuard:
    def __init__(self, xf: Xurface, user: str, agent: str, wait_ms: int = 0):
        self.xf = xf
        self.ctx = {"user": user, "agent": agent, "wait_ms": wait_ms}
        self._tools: Dict[str, dict] = {}

    def register(self, name: str, func: Callable[..., Any], capability: Optional[str] = None,
                 description: str = "", parameters: Optional[dict] = None) -> "OpenAIGuard":
        self._tools[name] = {"func": func, "capability": capability or name,
                             "description": description,
                             "parameters": parameters or {"type": "object", "properties": {}}}
        return self

    def openai_tools(self) -> list:
        return [{"type": "function",
                 "function": {"name": n, "description": t["description"], "parameters": t["parameters"]}}
                for n, t in self._tools.items()]

    def dispatch(self, tool_call: Any) -> dict:
        """Guard + run one tool_call (dict or SDK object). Returns an OpenAI tool message."""
        fn = _get(tool_call, "function")
        name = _get(fn, "name")
        call_id = _get(tool_call, "id")
        raw_args = _get(fn, "arguments") or "{}"
        try:
            args = json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
        except Exception:
            args = {}
        tool = self._tools.get(name)
        if not tool:
            return _msg(call_id, name, {"error": f"unknown tool {name}"})

        out = run_guarded(self.xf, user=self.ctx["user"], agent=self.ctx["agent"],
                          capability=tool["capability"],
                          exec_fn=lambda final: tool["func"](**final), args=args,
                          wait_ms=self.ctx["wait_ms"])
        g = out["guard"]
        meta = {"state": g.state, "severity": g.severity, "intent": g.intent_id, "reasons": g.reasons}
        if out["ok"]:
            return _msg(call_id, name, {"ok": True, "result": out["result"], "xurface": meta})
        return _msg(call_id, name, {"ok": False, "blocked": True, "reason": out["message"], "xurface": meta})


def _get(obj: Any, key: str) -> Any:
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _msg(tool_call_id: str, name: str, payload: dict) -> dict:
    return {"role": "tool", "tool_call_id": tool_call_id, "name": name, "content": json.dumps(payload)}
