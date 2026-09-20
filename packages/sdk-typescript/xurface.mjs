/**
 * Xurface Horizon SDK (developer resources) - TypeScript / JavaScript.
 *
 * Horizon is the discernment checkpoint an AI agent routes through before it
 * takes a critical action on a person's behalf. This client gives an agent two
 * things, in one call:
 *
 *   1. a record - every critical action is written to Horizon's signed,
 *      hash-chained audit ledger, whether it is allowed or not; and
 *   2. discernment - when the action's risk exceeds what the person tolerates,
 *      Horizon holds it and pushes it to that person's Xurface Discern app for
 *      an approve / edit / deny, and the agent waits for the verdict.
 *
 * The agent never hard-codes a risk threshold. It declares what it can do;
 * Horizon scores each ability against a standards-based taxonomy; the person
 * sets an appetite; Horizon reconciles the three at runtime.
 *
 * Zero dependencies. Uses the global `fetch` (Node >= 18, browsers, workers).
 *
 * @example
 *   import { Xurface } from "xurface";
 *   const xf = new Xurface({ clientId, clientSecret });
 *   await xf.declareAgent("apply-bot", { display_name: "Apply Bot", abilities: [
 *     { key: "reply.send", kind: "tool", description: "Send a reply to a recruiter" },
 *   ]});
 *   const xid = await xf.resolveUser("email", "ada@example.com");
 *   const verdict = await xf.guard({ user: xid, agent: "apply-bot",
 *     capability: "reply.send", details: { to: "recruiter@acme.co" }, wait: 120000 });
 *   if (verdict.allowed) await reallySend(verdict.details);
 */

const DEFAULT_API_BASE = "https://xurface.500xlaunch.com";

/** An error carrying the HTTP status Horizon returned. */
export class XurfaceError extends Error {
  /** @param {number} status @param {string} message @param {any} [body] */
  constructor(status, message, body) {
    super(message);
    this.name = "XurfaceError";
    this.status = status;
    this.body = body;
  }
}

/**
 * The Horizon client for the *agent* side of a Solution. One instance per
 * Solution (client credentials); it manages its own access token.
 */
export class Xurface {
  /**
   * @param {object} opts
   * @param {string} opts.clientId       Solution client id (cli_...)
   * @param {string} opts.clientSecret   Solution client secret (xsk_...)
   * @param {string} [opts.apiBase]      default https://xurface.500xlaunch.com
   * @param {"test"|"live"} [opts.env]   which Horizon environment (default live)
   * @param {typeof fetch} [opts.fetch]  override the fetch implementation
   * @param {(evt: {level:string,msg:string,data?:any}) => void} [opts.onLog]
   */
  constructor(opts) {
    if (!opts || !opts.clientId || !opts.clientSecret) {
      throw new XurfaceError(0, "clientId and clientSecret are required");
    }
    this.apiBase = (opts.apiBase || DEFAULT_API_BASE).replace(/\/+$/, "");
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.env = opts.env === "test" ? "test" : null; // live is the default; header only for test
    this._fetch = opts.fetch || globalThis.fetch;
    if (!this._fetch) throw new XurfaceError(0, "no fetch available; pass opts.fetch");
    this._onLog = opts.onLog || (() => {});
    /** @type {{token:string, exp:number}|null} */
    this._tok = null;
  }

  /** Build a client straight from a Solution Manifest (xurface-solution.json). */
  static fromManifest(manifest, extra = {}) {
    return new Xurface({
      clientId: manifest.auth.client_id,
      clientSecret: manifest.auth.client_secret,
      apiBase: (manifest.endpoints?.api || "").replace(/\/v1$/, "") || undefined,
      ...extra,
    });
  }

  // -- transport ------------------------------------------------------------

  async _accessToken() {
    // refresh 60s before expiry
    if (this._tok && this._tok.exp - 60_000 > Date.now()) return this._tok.token;
    const res = await this._fetch(`${this.apiBase}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(this.env ? { "x-xurface-env": this.env } : {}) },
      body: JSON.stringify({ client_id: this.clientId, client_secret: this.clientSecret }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new XurfaceError(res.status, data.error || "token request failed", data);
    this._tok = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 900) * 1000 };
    return this._tok.token;
  }

  /** @param {"GET"|"POST"|"PUT"|"DELETE"} method */
  async _api(method, path, body, { auth = true, retryOn401 = true } = {}) {
    const headers = { "content-type": "application/json" };
    if (this.env) headers["x-xurface-env"] = this.env;
    if (auth) headers.authorization = `Bearer ${await this._accessToken()}`;
    const res = await this._fetch(`${this.apiBase}${path}`, {
      method, headers, body: body != null ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && auth && retryOn401) {
      this._tok = null; // token may have expired mid-flight; refresh once
      return this._api(method, path, body, { auth, retryOn401: false });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new XurfaceError(res.status, data.error || `${method} ${path} failed`, data);
    return data;
  }

  // -- catalogue ------------------------------------------------------------

  /** The public risk taxonomy Horizon scores every ability against. */
  taxonomy() {
    return this._api("GET", "/v1/risk/taxonomy", undefined, { auth: false });
  }

  /** The rate + discernment limits in force for this Solution. */
  limits() {
    return this._api("GET", "/v1/limits");
  }

  /**
   * Declare an agent and what it can do. Horizon scores each ability and returns
   * the effective severity + per-category risk. Idempotent - call it on boot.
   * @param {string} agentId
   * @param {{display_name?:string, description?:string, logo?:string,
   *   abilities?: Array<{key:string, kind:"skill"|"tool"|"capability",
   *   description?:string, developer_risk?:any, discernment?:"auto"|"always"|"never",
   *   requires_auth?:string[], schema?:any}>}} decl
   */
  declareAgent(agentId, decl) {
    return this._api("PUT", `/v1/agents/${encodeURIComponent(agentId)}`, decl);
  }

  // -- users / links --------------------------------------------------------

  /**
   * Ask Horizon whether it knows this person and whether they have linked this
   * Solution. Returns { status: "none" | "pending" | "linked", ... }. A match is
   * never silently a link: the person must approve the link request in Discern.
   * @param {"email"|"phone"|"external_id"} type
   */
  discover(type, value) {
    return this._api("POST", "/v1/discovery/users", { user_ref: { type, value } });
  }

  /**
   * Resolve a person to the pairwise `xid` the Solution uses in guard() calls,
   * or return null when they are not linked yet (status none/pending).
   * @returns {Promise<string|null>}
   */
  async resolveUser(type, value) {
    const d = await this.discover(type, value);
    return d.status === "linked" ? d.user : null;
  }

  // -- the guard: record + discern -----------------------------------------

  /**
   * Record a critical action and reconcile it against the person's appetite. If
   * it is within appetite it is allowed immediately (and logged). If it exceeds
   * appetite (or is SEVERE, or the developer marked it "always"), Horizon holds
   * it, pushes it to the person's Discern app, and - when `wait` > 0 - this
   * blocks until they decide or the wait elapses.
   *
   * @param {object} p
   * @param {string} p.user          the pairwise xid from resolveUser()
   * @param {string} p.agent         the declared agent id
   * @param {string} p.capability    the ability key (e.g. "reply.send")
   * @param {Record<string,unknown>} [p.details]  the concrete arguments
   * @param {Array<{capability:string, details?:any, input_request?:string}>} [p.sequence]
   *        declare a whole plan at once; the card shows every step, max risk drives it
   * @param {number} [p.wait=0]      ms to wait for a human decision (0 = don't block)
   * @param {boolean} [p.push=true]  push to the person's device when held
   * @returns {Promise<GuardResult>}
   */
  async guard(p) {
    if (!p || !p.user || !p.agent || !p.capability) {
      throw new XurfaceError(0, "guard requires { user, agent, capability }");
    }
    let intent = await this._api("POST", "/v1/intents", {
      user: p.user, agent: p.agent, capability: p.capability,
      details: p.details, sequence: p.sequence,
    });
    this._onLog({ level: "info", msg: `guard ${p.capability} -> ${intent.state} (${intent.severity})`, data: intent });

    if (intent.state !== "pending") return this._result(intent, p);

    if (p.push !== false) {
      try { await this._api("POST", `/v1/intents/${intent.id}/push`); }
      catch (e) { this._onLog({ level: "warn", msg: "push failed", data: e }); }
    }

    const deadline = Date.now() + (p.wait ?? 0);
    while (intent.state === "pending" && Date.now() < deadline) {
      const remaining = Math.min(30_000, deadline - Date.now());
      if (remaining <= 0) break;
      try {
        intent = await this._api("GET", `/v1/intents/${intent.id}/await?timeout=${remaining}`);
      } catch (e) {
        if (e instanceof XurfaceError && e.status === 404) break; // expired + swept
        throw e;
      }
    }
    return this._result(intent, p);
  }

  /** @returns {GuardResult} */
  _result(intent, p) {
    const allowed = intent.state === "allowed" || intent.state === "approved" || intent.state === "edited";
    return {
      allowed,
      state: intent.state,
      intentId: intent.id,
      severity: intent.severity,
      risk: intent.risk || {},
      reasons: intent.reasons || [],
      token: intent.token,
      // the human may have edited the arguments before approving; use these
      details: intent.decision?.edited_details ?? p.details,
      decision: intent.decision,
    };
  }

  // -- feedback loop --------------------------------------------------------

  /** The flags + reports people raised against this Solution's actions. */
  sideEffects() {
    return this._api("GET", "/v1/side-effects");
  }
}

/**
 * @typedef {object} GuardResult
 * @property {boolean} allowed            true when the agent may proceed
 * @property {string} state               allowed|approved|edited|pending|denied|expired
 * @property {string} intentId
 * @property {string} severity            LOW|MEDIUM|HIGH|SEVERE
 * @property {Record<string,string>} risk per-category severities Horizon scored
 * @property {string[]} reasons           why it was allowed or held
 * @property {string} [token]             a decision token proving the verdict
 * @property {Record<string,unknown>} [details]  arguments to use (possibly human-edited)
 * @property {any} [decision]             the raw decision when a human decided
 */

/**
 * Run a real tool through Horizon: guard first, execute only if allowed, and
 * hand back a structured result agent frameworks can turn into a tool message.
 * This is the primitive every framework adapter is built on.
 *
 * @template T
 * @param {Xurface} xf
 * @param {object} call
 * @param {string} call.user
 * @param {string} call.agent
 * @param {string} call.capability
 * @param {Record<string,unknown>} [call.args]
 * @param {number} [call.wait]
 * @param {(args: Record<string,unknown>) => Promise<T>|T} exec  the real tool body
 * @returns {Promise<{ok:boolean, guard:GuardResult, result?:T, message:string}>}
 */
export async function runGuarded(xf, call, exec) {
  const guard = await xf.guard({
    user: call.user, agent: call.agent, capability: call.capability,
    details: call.args || {}, wait: call.wait ?? 0,
  });
  if (guard.allowed) {
    const result = await exec(guard.details || call.args || {});
    return { ok: true, guard, result, message: `allowed (${guard.state})` };
  }
  const why = guard.reasons?.join("; ") || guard.state;
  return {
    ok: false, guard,
    message: guard.state === "pending"
      ? `held for the person's discernment (${call.capability}); not executed`
      : `blocked by Xurface (${guard.state}): ${why}`,
  };
}
