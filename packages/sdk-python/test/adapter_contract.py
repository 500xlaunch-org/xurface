"""The adapter contract test - Python. Offline, no Horizon server: it mocks the
Xurface client and checks every adapter (including a contributed one) against the
same three behaviors:

  1. an ALLOWED capability runs the real tool body and surfaces the result;
  2. a HELD/DENIED capability does NOT run the tool body and signals blocked;
  3. the adapter guards with the tool's declared capability.

Run: python3 test/adapter_contract.py   (exit non-zero on any failure)
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))

from xurface import GuardResult  # noqa: E402
from xurface.adapters.openai import OpenAIGuard  # noqa: E402
from xurface.adapters.anthropic import AnthropicGuard  # noqa: E402
from xurface.adapters.gemini import GeminiGuard  # noqa: E402
from xurface.adapters.langgraph import guarded_tool  # noqa: E402
from xurface.adapters.crewai import guarded_crew_tool  # noqa: E402

passed = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  PASS  {msg}")


class MockXurface:
    """Decides by a per-capability policy and records calls - no server."""

    def __init__(self, policy=None):
        self.policy = policy or {}
        self.calls = []

    def guard(self, user, agent, capability, details=None, sequence=None, wait_ms=0, push=True):
        self.calls.append(capability)
        allowed = self.policy.get(capability, "allow") == "allow"
        return GuardResult(allowed=allowed, state="allowed" if allowed else "denied",
                           intent_id="int_mock", severity="HIGH", risk={},
                           reasons=["within appetite"] if allowed else ["above appetite"],
                           token="tok" if allowed else None, details=details, decision=None)


def main():
    # OpenAI
    xf = MockXurface({"pay_now": "deny"})
    ran = {"safe": 0, "pay": 0}
    og = OpenAIGuard(xf, user="xid", agent="a", wait_ms=0)
    og.register("safe_read", lambda **kw: ran.__setitem__("safe", ran["safe"] + 1) or {"echo": kw}, capability="data.read")
    og.register("pay_now", lambda **kw: ran.__setitem__("pay", ran["pay"] + 1) or "paid", capability="pay_now")
    m = og.dispatch({"id": "c1", "function": {"name": "safe_read", "arguments": json.dumps({"q": "x"})}})
    assert m["role"] == "tool" and json.loads(m["content"])["ok"] and ran["safe"] == 1
    held = json.loads(og.dispatch({"id": "c2", "function": {"name": "pay_now", "arguments": "{}"}})["content"])
    assert held["blocked"] and ran["pay"] == 0
    assert xf.calls == ["data.read", "pay_now"]
    ok("OpenAI adapter satisfies the contract")

    # Anthropic
    xf = MockXurface({"brief.broadcast": "deny"})
    ran = {"s": 0, "b": 0}
    ag = AnthropicGuard(xf, user="xid", agent="a", wait_ms=0)
    ag.register("summarize", lambda **kw: ran.__setitem__("s", ran["s"] + 1) or "ok", capability="brief.summarize")
    ag.register("broadcast", lambda **kw: ran.__setitem__("b", ran["b"] + 1) or "sent", capability="brief.broadcast")
    okb = ag.dispatch({"type": "tool_use", "id": "t1", "name": "summarize", "input": {}})
    assert okb["type"] == "tool_result" and okb["is_error"] is False and ran["s"] == 1
    heldb = ag.dispatch({"type": "tool_use", "id": "t2", "name": "broadcast", "input": {}})
    assert heldb["is_error"] is True and ran["b"] == 0
    ok("Anthropic adapter satisfies the contract")

    # Gemini (the CONTRIBUTING example)
    xf = MockXurface({"deploy.production": "deny"})
    ran = {"r": 0, "d": 0}
    gg = GeminiGuard(xf, user="xid", agent="a", wait_ms=0)
    gg.register("read_repo", lambda **kw: ran.__setitem__("r", ran["r"] + 1) or {"files": 3}, capability="repo.read")
    gg.register("deploy", lambda **kw: ran.__setitem__("d", ran["d"] + 1) or "deployed", capability="deploy.production")
    assert len(gg.gemini_tools()[0]["function_declarations"]) == 2
    okp = gg.dispatch({"name": "read_repo", "args": {"path": "src/"}})
    assert okp["function_response"]["response"]["ok"] and ran["r"] == 1
    heldp = gg.dispatch({"name": "deploy", "args": {"service": "api"}})
    assert heldp["function_response"]["response"]["blocked"] and ran["d"] == 0
    ok("Gemini adapter (the CONTRIBUTING example) satisfies the contract")

    # LangGraph
    xf = MockXurface({"job.apply": "deny"})
    ran = {"n": 0}
    tool = guarded_tool(xf, {"user": "xid", "agent": "a", "wait_ms": 0}, name="update_cv",
                        func=lambda **kw: ran.__setitem__("n", ran["n"] + 1) or "ok", capability="cv.update")
    assert json.loads(tool.invoke({"section": "skills"}))["ok"] and ran["n"] == 1
    held = json.loads(guarded_tool(xf, {"user": "xid", "agent": "a", "wait_ms": 0}, name="apply",
                                   func=lambda **kw: "NO", capability="job.apply").invoke({"c": "x"}))
    assert held["blocked"]
    ok(f"LangGraph adapter ({type(tool).__name__}) satisfies the contract")

    # CrewAI
    xf = MockXurface({"job.apply": "deny"})
    ran = {"n": 0}
    ctool = guarded_crew_tool(xf, {"user": "xid", "agent": "a", "wait_ms": 0}, name="update_cv",
                              func=lambda **kw: ran.__setitem__("n", ran["n"] + 1) or "ok", capability="cv.update")
    assert json.loads(ctool.run(section="skills"))["ok"] and ran["n"] == 1
    cheld = json.loads(guarded_crew_tool(xf, {"user": "xid", "agent": "a", "wait_ms": 0}, name="apply",
                                         func=lambda **kw: "NO", capability="job.apply").run(c="x"))
    assert cheld["blocked"]
    ok(f"CrewAI adapter ({type(ctool).__name__}) satisfies the contract")

    print(f"\nALL ADAPTER CONTRACT CHECKS PASSED ({passed})")


if __name__ == "__main__":
    main()
