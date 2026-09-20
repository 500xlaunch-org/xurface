/**
 * Xurface Discern - the *person's* side of Horizon.
 *
 * This is what the Xurface Discern app (phone / tablet / laptop) is built on: a
 * person signs in, links the Solutions acting on their behalf, sets how much
 * risk each may take without asking (their appetite), and approves / edits /
 * denies the actions Horizon holds for them.
 *
 * The agent SDK (Xurface) and this consumer SDK are two ends of the same loop.
 * Examples and tests use this class to play the human so the whole flow runs
 * end to end without a real device.
 *
 * Zero dependencies. Uses the global `fetch`.
 */

import { XurfaceError } from "./xurface.mjs";

export class XurfaceConsumer {
  /**
   * @param {object} opts
   * @param {string} [opts.apiBase]     default https://xurface.500xlaunch.com
   * @param {string} [opts.token]       an existing user token (else call login)
   * @param {typeof fetch} [opts.fetch]
   */
  constructor(opts = {}) {
    this.apiBase = (opts.apiBase || "https://xurface.500xlaunch.com").replace(/\/+$/, "");
    this._fetch = opts.fetch || globalThis.fetch;
    this.token = opts.token || null;
    this.env = opts.env === "test" ? "test" : null; // live is the default
  }

  async _api(method, path, body, { auth = true } = {}) {
    const headers = { "content-type": "application/json" };
    if (this.env) headers["x-xurface-env"] = this.env;
    if (auth) {
      if (!this.token) throw new XurfaceError(401, "not signed in; call login() first");
      headers.authorization = `Bearer ${this.token}`;
    }
    const res = await this._fetch(`${this.apiBase}${path}`, {
      method, headers, body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new XurfaceError(res.status, data.error || `${method} ${path} failed`, data);
    return data;
  }

  /** Dev-grade sign-in by email (the shipping app uses passkeys). */
  async login(email, name) {
    const out = await this._api("POST", "/v1/user/login", { email, name }, { auth: false });
    this.token = out.token;
    this.user = out.user;
    return out.user;
  }

  /** Register a device so Horizon can push discernment requests to it. */
  registerDevice(platform, token, label) {
    return this._api("POST", "/v1/user/devices", { platform, token, label });
  }

  /** The Solutions this person has linked, with each one's appetite + agents. */
  solutions() {
    return this._api("GET", "/v1/user/solutions");
  }

  /**
   * Link a Solution the person was not auto-matched to, by handing it the
   * reference that Solution knows them by. Auto-activates the pending link.
   */
  addSolution(solutionUid, type, value) {
    return this._api("POST", "/v1/user/solutions/add", { solution_uid: solutionUid, type, value });
  }

  /** Set (or adjust) the discernment appetite for one link. */
  setAppetite(linkId, appetite) {
    return this._api("POST", `/v1/user/links/${linkId}/appetite`, { appetite });
  }

  /** Pause (agents get 403), resume, or revoke a Solution's link - the kill switch. */
  setLinkStatus(linkId, status) {
    return this._api("POST", `/v1/user/links/${linkId}/status`, { status });
  }

  /** The pending discernment inbox (stale ones already expired). */
  async inbox() {
    const out = await this._api("GET", "/v1/user/inbox");
    return out.intents;
  }

  /** The full timeline of actions - allowed and decided - for this person. */
  async timeline() {
    const out = await this._api("GET", "/v1/user/timeline");
    return out.intents;
  }

  /**
   * Decide a held intent.
   * @param {string} intentId
   * @param {"approve"|"approve_all"|"deny"} decision
   * @param {{step?:number, input?:string, edited_details?:object, biometric?:boolean}} [opts]
   */
  decide(intentId, decision, opts = {}) {
    return this._api("POST", `/v1/user/intents/${intentId}/decide`, { decision, ...opts });
  }

  /** Flag a declared action that was mis-scored or ignored the appetite. */
  flag(intentId, reason, suggested) {
    return this._api("POST", "/v1/user/flag", { intent_id: intentId, reason, suggested });
  }

  /** Report an action the agent took that was never declared. */
  report(solutionUid, reason, extra = {}) {
    return this._api("POST", "/v1/user/report", { solution_uid: solutionUid, reason, ...extra });
  }

  /**
   * Convenience for examples/tests: approve the first pending link request for a
   * Solution, turning a `pending` discovery into a `linked` one.
   */
  async approveLink() {
    const pend = (await this.inbox()).filter((i) => i.kind === "link_request");
    for (const i of pend) await this.decide(i.id, "approve");
    return pend.length;
  }
}
