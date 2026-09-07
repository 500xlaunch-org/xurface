"""Xurface client. Standard library only. License: Apache-2.0."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Optional


class XurfaceError(Exception):
    def __init__(self, message: str, status: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status = status
        self.body = body


class XurfaceDenied(XurfaceError):
    """The user denied the action. Deny always denies the whole sequence."""


class XurfaceRateLimited(XurfaceError):
    def __init__(self, retry_after_s: float, body: Any = None):
        super().__init__(f"rate limited, retry in {retry_after_s}s", 429, body)
        self.retry_after_s = retry_after_s


class Xurface:
    """Discernment for AI agents. Built from a Horizon Solution Manifest."""

    def __init__(self, spec: Optional[dict] = None, spec_path: Optional[str] = None,
                 retry_on_rate_limit: bool = True):
        if spec is None and spec_path:
            with open(spec_path, "r", encoding="utf-8") as f:
                spec = json.load(f)
        if spec is None:
            raise XurfaceError("Xurface needs a Solution Manifest: pass spec or spec_path")
        self.spec = spec
        self.retry_on_rate_limit = retry_on_rate_limit
        self.rate_limit: dict = {}
        self._token: Optional[tuple[str, float]] = None  # (value, expiry epoch)

    @classmethod
    def from_spec(cls, path: Optional[str] = None) -> "Xurface":
        p = path or os.environ.get("XURFACE_SOLUTION_SPEC")
        if not p:
            raise XurfaceError("no spec path given and XURFACE_SOLUTION_SPEC is not set")
        return cls(spec_path=p)

    # -- credentials (OAuth-like) --------------------------------------------

    def _access_token(self) -> str:
        now = time.time()
        if self._token and self._token[1] - 30 > now:
            return self._token[0]
        auth = self.spec["auth"]
        body = self._http("POST", auth["token_url"], {
            "grant_type": "client_credentials",
            "client_id": auth["client_id"],
            "client_secret": auth["client_secret"],
            "audience": auth.get("audience") or self.spec["solution"]["uid"],
        }, bearer=False)
        self._token = (body["access_token"], now + float(body.get("expires_in", 900)))
        return self._token[0]

    def _http(self, method: str, url: str, payload: Any = None,
              bearer: bool = True, attempt: int = 0) -> Any:
        headers = {"accept": "application/json"}
        data = None
        if payload is not None:
            headers["content-type"] = "application/json"
            data = json.dumps(payload).encode()
        if bearer:
            headers["authorization"] = f"Bearer {self._access_token()}"
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=45) as res:
                self._read_limits(res.headers)
                return json.loads(res.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            body = None
            try:
                body = json.loads(e.read().decode() or "null")
            except Exception:
                pass
            if e.code == 429:
                wait = float(e.headers.get("retry-after") or 5)
                if self.retry_on_rate_limit and attempt < 2:
                    time.sleep(wait)
                    return self._http(method, url, payload, bearer, attempt + 1)
                raise XurfaceRateLimited(wait, body) from None
            raise XurfaceError(f"{method} {url} failed ({e.code})", e.code, body) from None

    def _read_limits(self, headers) -> None:
        def num(k):
            v = headers.get(k)
            try:
                return int(v) if v is not None else None
            except ValueError:
                return None
        self.rate_limit = {
            "limit": num("x-xurface-limit"),
            "remaining": num("x-xurface-remaining"),
            "reset": num("x-xurface-reset"),
        }

    def _api(self, method: str, path: str, payload: Any = None) -> Any:
        return self._http(method, f"{self.spec['endpoints']['api']}{path}", payload)

    # -- onboarding ----------------------------------------------------------

    def declare_agent(self, agent_id: str, display_name: Optional[str] = None,
                      logo: Optional[str] = None, description: Optional[str] = None,
                      abilities: Optional[list[dict]] = None) -> dict:
        """Declare the agent: identity + what it can do on behalf of the user."""
        return self._api("PUT", f"/agents/{agent_id}", {
            "name": agent_id, "display_name": display_name, "logo": logo,
            "description": description, "abilities": abilities or [],
        })

    def discover_user(self, ref_type: str, value: str) -> dict:
        """Self-discovery: find the Xurface user behind the Solution-side user id."""
        return self._api("POST", "/discovery/users",
                         {"user_ref": {"type": ref_type, "value": value}})

    # -- the three calls -----------------------------------------------------

    def on_xurface(self, user: str, agent: str, capability: str,
                   details: Optional[dict] = None,
                   sequence: Optional[list[dict]] = None) -> dict:
        req: dict = {"user": user, "agent": agent, "capability": capability}
        if details is not None:
            req["details"] = details
        if sequence is not None:
            req["sequence"] = sequence
        return self._api("POST", "/intents", req)

    def push_xurface(self, intent_id: str) -> dict:
        return self._api("POST", f"/intents/{intent_id}/push")

    def await_xurface(self, intent_id: str, timeout_s: float = 300.0) -> dict:
        deadline = time.time() + timeout_s
        while True:
            left = deadline - time.time()
            if left <= 0:
                raise XurfaceError(f"await_xurface timed out for {intent_id}")
            intent = self._api(
                "GET", f"/intents/{intent_id}/await?timeout={int(min(left, 30) * 1000)}")
            if intent.get("state") != "pending":
                return intent

    def guard(self, user: str, agent: str, capability: str,
              details: Optional[dict] = None, sequence: Optional[list[dict]] = None,
              timeout_s: float = 300.0) -> dict:
        """The three calls in one. Raises XurfaceDenied if the user denies."""
        risk = self.on_xurface(user, agent, capability, details, sequence)
        if risk.get("state") == "allowed":
            return risk
        self.push_xurface(risk["id"])
        decided = self.await_xurface(risk["id"], timeout_s)
        if decided.get("state") == "denied":
            raise XurfaceDenied(f"denied by the user: {capability}", 403, decided)
        return decided
