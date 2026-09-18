"""Xurface x Google Gemini (function calling) adapter - Python.

The worked example for CONTRIBUTING: adding a framework is ~40 lines that map the
framework's tool calls onto run_guarded. Gemini returns functionCall parts
({name, args}); your app replies with a functionResponse part. This adapter
records every call in Horizon and holds the risky ones for the person's
discernment before the tool runs.

Example
-------
    guard = GeminiGuard(xf, user=xid, agent="apply-bot", wait_ms=120000)
    guard.register("send_reply", send_reply, capability="reply.send",
                   description="Email a recruiter back",
                   parameters={"type": "object", "properties": {"to": {"type": "string"}}})
    # ... put guard.gemini_tools() in your generate_content request ...
    for part in candidate.content.parts:
        if getattr(part, "function_call", None):
            responses.append(guard.dispatch(part.function_call))
"""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional

from .. import Xurface, run_guarded


class GeminiGuard:
    def __init__(self, xf: Xurface, user: str, agent: str, wait_ms: int = 0):
        self.xf = xf
        self.ctx = {"user": user, "agent": agent, "wait_ms": wait_ms}
        self._tools: Dict[str, dict] = {}

    def register(self, name: str, func: Callable[..., Any], capability: Optional[str] = None,
                 description: str = "", parameters: Optional[dict] = None) -> "GeminiGuard":
        self._tools[name] = {"func": func, "capability": capability or name,
                             "description": description,
                             "parameters": parameters or {"type": "object", "properties": {}}}
        return self

    def gemini_tools(self) -> list:
        return [{"function_declarations": [
            {"name": n, "description": t["description"], "parameters": t["parameters"]}
            for n, t in self._tools.items()]}]

    def dispatch(self, function_call: Any) -> dict:
        """Guard + run one functionCall (dict or SDK object). Returns a functionResponse part."""
        name = _get(function_call, "name")
        args = _get(function_call, "args") or {}
        if not isinstance(args, dict):
            args = {}
        tool = self._tools.get(name)
        if not tool:
            return _part(name, {"error": f"unknown tool {name}"})

        out = run_guarded(self.xf, user=self.ctx["user"], agent=self.ctx["agent"],
                          capability=tool["capability"],
                          exec_fn=lambda final: tool["func"](**final), args=args,
                          wait_ms=self.ctx["wait_ms"])
        g = out["guard"]
        meta = {"state": g.state, "severity": g.severity, "intent": g.intent_id, "reasons": g.reasons}
        if out["ok"]:
            return _part(name, {"ok": True, "result": out["result"], "xurface": meta})
        return _part(name, {"ok": False, "blocked": True, "reason": out["message"], "xurface": meta})


def _get(obj: Any, key: str) -> Any:
    if isinstance(obj, dict):
        return obj.get(key)
    return getattr(obj, key, None)


def _part(name: str, response: dict) -> dict:
    return {"function_response": {"name": name, "response": response}}
