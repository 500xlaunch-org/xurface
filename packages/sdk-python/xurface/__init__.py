"""Xurface Horizon SDK (developer resources) - Python.

Horizon is the discernment checkpoint an AI agent routes through before it takes
a critical action on a person's behalf. This client gives an agent two things in
one call: a *record* (every critical action is written to Horizon's signed,
hash-chained audit ledger) and *discernment* (when the risk exceeds what the
person tolerates, Horizon holds the action and pushes it to their Xurface
Discern app for an approve / edit / deny, and the agent waits for the verdict).

The agent never hard-codes a threshold. It declares what it can do; Horizon
scores each ability against a standards-based taxonomy; the person sets an
appetite; Horizon reconciles the three at runtime.

Zero third-party dependencies - standard library only (urllib).

Example
-------
    from xurface import Xurface
    xf = Xurface(client_id=..., client_secret=...)
    xf.declare_agent("apply-bot", display_name="Apply Bot", abilities=[
        {"key": "reply.send", "kind": "tool", "description": "Send a reply to a recruiter"},
    ])
    xid = xf.resolve_user("email", "ada@example.com")
    verdict = xf.guard(user=xid, agent="apply-bot", capability="reply.send",
                       details={"to": "recruiter@acme.co"}, wait_ms=120000)
    if verdict.allowed:
        really_send(verdict.details)
"""

from __future__ import annotations

import json
import time
import urllib.request
import urllib.error
import urllib.parse
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

DEFAULT_API_BASE = "https://xurface.500xlaunch.com"

__all__ = ["Xurface", "XurfaceConsumer", "GuardResult", "XurfaceError", "run_guarded"]


class XurfaceError(Exception):
    """An error carrying the HTTP status Horizon returned."""

    def __init__(self, status: int, message: str, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


@dataclass
class GuardResult:
    allowed: bool
    state: str
    intent_id: str
    severity: str
    risk: Dict[str, str]
    reasons: List[str]
    token: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    decision: Optional[Dict[str, Any]] = None


def _http(method: str, url: str, body: Optional[dict], headers: Dict[str, str]) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode() or "{}"
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or "{}"
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"error": raw}
        raise XurfaceError(e.code, parsed.get("error", f"{method} {url} failed"), parsed)
    except urllib.error.URLError as e:  # pragma: no cover - network shape
        raise XurfaceError(0, f"connection failed: {e.reason}")


class Xurface:
    """The Horizon client for the *agent* side of a Solution."""

    def __init__(self, client_id: str, client_secret: str,
                 api_base: str = DEFAULT_API_BASE, on_log: Optional[Callable[[dict], None]] = None):
        if not client_id or not client_secret:
            raise XurfaceError(0, "client_id and client_secret are required")
        self.api_base = api_base.rstrip("/")
        self.client_id = client_id
        self.client_secret = client_secret
        self._on_log = on_log or (lambda evt: None)
        self._token: Optional[str] = None
        self._token_exp: float = 0.0

    @classmethod
    def from_manifest(cls, manifest: dict, **kw) -> "Xurface":
        api = manifest.get("endpoints", {}).get("api", "")
        base = api[:-3] if api.endswith("/v1") else DEFAULT_API_BASE
        return cls(client_id=manifest["auth"]["client_id"],
                   client_secret=manifest["auth"]["client_secret"],
                   api_base=kw.pop("api_base", base), **kw)

    # -- transport ---------------------------------------------------------

    def _access_token(self) -> str:
        if self._token and self._token_exp - 60 > time.time():
            return self._token
        out = _http("POST", f"{self.api_base}/oauth/token",
                    {"client_id": self.client_id, "client_secret": self.client_secret},
                    {"content-type": "application/json"})
        self._token = out["access_token"]
        self._token_exp = time.time() + out.get("expires_in", 900)
        return self._token

    def _api(self, method: str, path: str, body: Optional[dict] = None, auth: bool = True) -> Any:
        headers = {"content-type": "application/json"}
        if auth:
            headers["authorization"] = f"Bearer {self._access_token()}"
        try:
            return _http(method, f"{self.api_base}{path}", body, headers)
        except XurfaceError as e:
            if e.status == 401 and auth:
                self._token = None
                headers["authorization"] = f"Bearer {self._access_token()}"
                return _http(method, f"{self.api_base}{path}", body, headers)
            raise

    # -- catalogue ---------------------------------------------------------

    def taxonomy(self) -> Any:
        return self._api("GET", "/v1/risk/taxonomy", auth=False)

    def limits(self) -> Any:
        return self._api("GET", "/v1/limits")

    def declare_agent(self, agent_id: str, abilities: Optional[List[dict]] = None,
                      display_name: Optional[str] = None, description: Optional[str] = None,
                      logo: Optional[str] = None) -> Any:
        """Declare an agent + what it can do. Horizon scores each ability. Idempotent."""
        decl: Dict[str, Any] = {"abilities": abilities or []}
        if display_name:
            decl["display_name"] = display_name
        if description:
            decl["description"] = description
        if logo:
            decl["logo"] = logo
        return self._api("PUT", f"/v1/agents/{urllib.parse.quote(agent_id, safe='')}", decl)

    # -- users / links -----------------------------------------------------

    def discover(self, ref_type: str, value: str) -> Any:
        return self._api("POST", "/v1/discovery/users", {"user_ref": {"type": ref_type, "value": value}})

    def resolve_user(self, ref_type: str, value: str) -> Optional[str]:
        """Return the pairwise xid if linked, else None (status none/pending)."""
        d = self.discover(ref_type, value)
        return d.get("user") if d.get("status") == "linked" else None

    # -- the guard: record + discern --------------------------------------

    def guard(self, user: str, agent: str, capability: str,
              details: Optional[dict] = None, sequence: Optional[List[dict]] = None,
              wait_ms: int = 0, push: bool = True) -> GuardResult:
        """Record a critical action and reconcile it against the person's appetite.

        Within appetite -> allowed immediately (and logged). Above appetite (or
        SEVERE, or developer 'always') -> held, pushed to Discern, and - when
        wait_ms > 0 - this blocks until the person decides or the wait elapses.
        """
        if not (user and agent and capability):
            raise XurfaceError(0, "guard requires user, agent and capability")
        intent = self._api("POST", "/v1/intents",
                            {"user": user, "agent": agent, "capability": capability,
                             "details": details, "sequence": sequence})
        self._on_log({"level": "info", "msg": f"guard {capability} -> {intent['state']} ({intent['severity']})"})

        if intent["state"] != "pending":
            return self._result(intent, details)

        if push:
            try:
                self._api("POST", f"/v1/intents/{intent['id']}/push")
            except XurfaceError:
                pass

        deadline = time.time() + wait_ms / 1000.0
        while intent["state"] == "pending" and time.time() < deadline:
            remaining = min(30000, int((deadline - time.time()) * 1000))
            if remaining <= 0:
                break
            try:
                intent = self._api("GET", f"/v1/intents/{intent['id']}/await?timeout={remaining}")
            except XurfaceError as e:
                if e.status == 404:
                    break
                raise
        return self._result(intent, details)

    @staticmethod
    def _result(intent: dict, sent_details: Optional[dict]) -> GuardResult:
        state = intent["state"]
        allowed = state in ("allowed", "approved", "edited")
        decision = intent.get("decision") or {}
        return GuardResult(
            allowed=allowed, state=state, intent_id=intent["id"],
            severity=intent.get("severity", "LOW"), risk=intent.get("risk", {}),
            reasons=intent.get("reasons", []), token=intent.get("token"),
            details=decision.get("edited_details") or sent_details,
            decision=intent.get("decision"),
        )

    # -- feedback ----------------------------------------------------------

    def side_effects(self) -> Any:
        return self._api("GET", "/v1/side-effects")


def run_guarded(xf: Xurface, user: str, agent: str, capability: str,
                exec_fn: Callable[[dict], Any], args: Optional[dict] = None, wait_ms: int = 0) -> dict:
    """Guard first, run the real tool body only if allowed. The primitive every
    Python framework adapter is built on."""
    guard = xf.guard(user=user, agent=agent, capability=capability, details=args or {}, wait_ms=wait_ms)
    if guard.allowed:
        result = exec_fn(guard.details or args or {})
        return {"ok": True, "guard": guard, "result": result, "message": f"allowed ({guard.state})"}
    why = "; ".join(guard.reasons) or guard.state
    msg = (f"held for the person's discernment ({capability}); not executed"
           if guard.state == "pending" else f"blocked by Xurface ({guard.state}): {why}")
    return {"ok": False, "guard": guard, "result": None, "message": msg}


class XurfaceConsumer:
    """Xurface Discern - the person's side of Horizon (used by examples/tests to
    play the human)."""

    def __init__(self, api_base: str = DEFAULT_API_BASE, token: Optional[str] = None):
        self.api_base = api_base.rstrip("/")
        self.token = token
        self.user: Optional[dict] = None

    def _api(self, method: str, path: str, body: Optional[dict] = None, auth: bool = True) -> Any:
        headers = {"content-type": "application/json"}
        if auth:
            if not self.token:
                raise XurfaceError(401, "not signed in; call login() first")
            headers["authorization"] = f"Bearer {self.token}"
        return _http(method, f"{self.api_base}{path}", body, headers)

    def login(self, email: str, name: Optional[str] = None) -> dict:
        out = self._api("POST", "/v1/user/login", {"email": email, "name": name}, auth=False)
        self.token = out["token"]
        self.user = out["user"]
        return out["user"]

    def register_device(self, platform: str, token: str, label: Optional[str] = None) -> Any:
        return self._api("POST", "/v1/user/devices", {"platform": platform, "token": token, "label": label})

    def solutions(self) -> Any:
        return self._api("GET", "/v1/user/solutions")

    def set_appetite(self, link_id: str, appetite: dict) -> Any:
        return self._api("POST", f"/v1/user/links/{link_id}/appetite", {"appetite": appetite})

    def set_link_status(self, link_id: str, status: str) -> Any:
        return self._api("POST", f"/v1/user/links/{link_id}/status", {"status": status})

    def inbox(self) -> List[dict]:
        return self._api("GET", "/v1/user/inbox")["intents"]

    def timeline(self) -> List[dict]:
        return self._api("GET", "/v1/user/timeline")["intents"]

    def decide(self, intent_id: str, decision: str, **opts) -> Any:
        return self._api("POST", f"/v1/user/intents/{intent_id}/decide", {"decision": decision, **opts})

    def approve_link(self) -> int:
        pend = [i for i in self.inbox() if i.get("kind") == "link_request"]
        for i in pend:
            self.decide(i["id"], "approve")
        return len(pend)
