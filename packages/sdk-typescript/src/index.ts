/**
 * Xurface SDK for TypeScript.
 *
 * You declare what your agents can do. Horizon scores the risk. The user's
 * appetite decides what needs discernment. You never hard-code a threshold:
 *
 *   const xf = Xurface.fromSpec("./xurface-solution.json");
 *
 *   // self-declare: skills, tools, capabilities. developer_risk is OPTIONAL.
 *   await xf.declareAgent("apply-bot", { displayName: "Apply Bot", abilities: [
 *     { key: "offers.scan", kind: "skill" },
 *     { key: "reply.send",  kind: "tool" },
 *     { key: "pay.invoice", kind: "capability", developer_risk: { financial: "HIGH" } },
 *   ]});
 *
 *   const { user } = await xf.discoverUser({ type: "email", value: "ada@example.com" });
 *
 *   // runtime: just do the thing behind guard(). Horizon already knows the
 *   // scores and this user's appetite, and returns the decision.
 *   const ok = await xf.guard({ user, agent: "apply-bot", capability: "pay.invoice",
 *                               details: { amount: 2400, currency: "USD" } });
 *   // ok.state is "allowed" | "approved" | "edited"; guard() throws on deny.
 *
 * Zero dependencies. Node 18+ (global fetch).
 * License: Apache-2.0.
 */

import { readFileSync } from "node:fs";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "SEVERE";

/** The categories Horizon scores every ability against (NIST / ISO informed). */
export type RiskCategory =
  | "identity" | "financial" | "location" | "intellectual" | "conversation" | "data" | "system";

/** A per-category severity map. Absent category means "not touched". Used for a
 * developer's optional risk evaluation, Horizon's score, and the user's appetite. */
export type RiskProfile = Partial<Record<RiskCategory, Severity>>;
export type Appetite = RiskProfile;

export type AbilityKind = "skill" | "tool" | "capability";

/** Whether an ability always asks, or lets Horizon decide against the user's
 * appetite. "never" is a request to suppress asking; it is honoured only where
 * the user's appetite already tolerates the score (the user is the floor). */
export type DiscernmentPolicy = "auto" | "always" | "never";

export type IntentState = "allowed" | "pending" | "approved" | "denied" | "edited" | "expired";

/** The downloaded Horizon Solution Manifest (xurface-solution.json). */
export interface SolutionSpec {
  spec_version: string;
  solution: { uid: string; slug: string; name: string; description?: string; icon?: string };
  auth: { token_url: string; client_id: string; client_secret: string; audience?: string };
  endpoints: { api: string; mcp?: string };
  user_ref?: { types: Array<"email" | "phone" | "external_id">; namespace?: string };
  limits?: Record<string, number>;
  credential_slots?: string[];
  signature?: string;
}

/** What you declare per ability. Only key and kind are required; in particular
 * developer_risk is optional. Omit it and Horizon scores the ability itself. */
export interface AbilityDeclaration {
  key: string;
  kind: AbilityKind;
  description?: string;
  requires_auth?: string[];
  schema?: Record<string, unknown>;
  /** optional: your own risk evaluation. Horizon holds its score as a floor and
   * blends by taking the higher severity per category, so this can only raise. */
  developer_risk?: RiskProfile | Severity;
  /** optional: adjust when this asks. Bounded by the user's appetite. */
  discernment?: DiscernmentPolicy;
}

export interface AgentDeclaration {
  displayName?: string;
  logo?: string;
  description?: string;
  abilities?: AbilityDeclaration[];
}

/** What Horizon returns for each declared ability: the effective score. */
export interface ScoredAbility {
  key: string;
  kind: AbilityKind;
  risk: RiskProfile;
  severity: Severity;
  risk_source: "developer" | "horizon" | "blended";
  discernment: DiscernmentPolicy;
}

export interface UserRef { type: "email" | "phone" | "external_id"; value: string }

export interface DiscoveryResult {
  status: "linked" | "pending" | "none";
  user?: string;      // pairwise id xid_...
  link?: string;
  appetite?: Appetite;
}

export interface SequenceStep {
  capability: string;
  details?: Record<string, unknown>;
  input_request?: string; // ask the user for a value; returned in decision.input
}

export interface IntentRequest {
  user: string;       // xid_... from discovery
  agent: string;
  capability: string;
  details?: Record<string, unknown>;
  sequence?: SequenceStep[];
}

export interface Decision {
  by?: string;
  at?: string;
  decision?: "approve" | "approve_all" | "deny";
  step?: number;
  input?: string;
  edited_details?: Record<string, unknown>;
}

export interface Intent {
  id: string;
  state: IntentState;
  severity: Severity;         // max across categories Horizon scored
  risk: RiskProfile;          // what it touched, per category
  reasons: string[];          // why it was allowed or pushed
  token?: string;             // present on allowed/approved
  decision?: Decision;
}

/** A user's after-the-fact signal on your Solution. A `flag` means a declared
 * action was mis-scored or ignored their appetite; a `report` means the agent
 * did something it never declared. */
export interface SideEffect {
  id: string;
  type: "flag" | "report";
  agentId?: string;
  capability?: string;
  intentId?: string;
  reason: string;
  suggested?: RiskProfile;
  status: "open" | "acknowledged" | "resolved";
  createdAt: number;
}

export interface RateLimitInfo { limit?: number; remaining?: number; reset?: number }

export class XurfaceError extends Error {
  status?: number;
  body?: unknown;
  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
export class XurfaceRateLimited extends XurfaceError {
  retryAfterMs: number;
  constructor(retryAfterMs: number, body?: unknown) {
    super(`rate limited, retry in ${retryAfterMs}ms`, 429, body);
    this.retryAfterMs = retryAfterMs;
  }
}

export interface XurfaceOptions {
  spec?: SolutionSpec;
  specPath?: string;
  fetch?: typeof fetch;
  /** automatic backoff-and-retry on 429 (default true, max 2 retries) */
  retryOnRateLimit?: boolean;
}

export class Xurface {
  readonly spec: SolutionSpec;
  private f: typeof fetch;
  private retry429: boolean;
  private token?: { value: string; exp: number };
  /** last seen rate limit headers, for pacing */
  rateLimit: RateLimitInfo = {};

  constructor(opts: XurfaceOptions) {
    const spec = opts.spec ?? (opts.specPath
      ? (JSON.parse(readFileSync(opts.specPath, "utf8")) as SolutionSpec)
      : undefined);
    if (!spec) throw new XurfaceError("Xurface needs a Solution Manifest: pass spec or specPath");
    this.spec = spec;
    this.f = opts.fetch ?? fetch;
    this.retry429 = opts.retryOnRateLimit !== false;
  }

  /** Load the manifest from disk (or XURFACE_SOLUTION_SPEC env var) and construct. */
  static fromSpec(path?: string): Xurface {
    const p = path ?? process.env.XURFACE_SOLUTION_SPEC;
    if (!p) throw new XurfaceError("no spec path given and XURFACE_SOLUTION_SPEC is not set");
    return new Xurface({ specPath: p });
  }

  // -- credentials (OAuth-like) ----------------------------------------------

  private async accessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.exp - 30_000 > now) return this.token.value;
    const res = await this.f(this.spec.auth.token_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.spec.auth.client_id,
        client_secret: this.spec.auth.client_secret,
        audience: this.spec.auth.audience ?? this.spec.solution.uid,
      }),
    });
    if (!res.ok) throw new XurfaceError(`token exchange failed (${res.status})`, res.status, await safeJson(res));
    const body = (await res.json()) as { access_token: string; expires_in?: number };
    this.token = { value: body.access_token, exp: now + (body.expires_in ?? 900) * 1000 };
    return this.token.value;
  }

  private async call<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
    const res = await this.f(`${this.spec.endpoints.api}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${await this.accessToken()}`,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    this.rateLimit = {
      limit: num(res.headers.get("x-xurface-limit")),
      remaining: num(res.headers.get("x-xurface-remaining")),
      reset: num(res.headers.get("x-xurface-reset")),
    };
    if (res.status === 429) {
      const wait = (num(res.headers.get("retry-after")) ?? 5) * 1000;
      if (this.retry429 && attempt < 2) {
        await sleep(wait);
        return this.call<T>(method, path, body, attempt + 1);
      }
      throw new XurfaceRateLimited(wait, await safeJson(res));
    }
    if (!res.ok) throw new XurfaceError(`${method} ${path} failed (${res.status})`, res.status, await safeJson(res));
    return (await res.json()) as T;
  }

  // -- onboarding ------------------------------------------------------------

  /** Declare the agent: identity + what it can do. Horizon scores each ability
   * and returns the effective per-category risk and severity. Idempotent. */
  declareAgent(agentId: string, decl: AgentDeclaration) {
    return this.call<{ agent: string; abilities: ScoredAbility[] }>(
      "PUT", `/agents/${encodeURIComponent(agentId)}`, {
        name: agentId,
        display_name: decl.displayName,
        logo: decl.logo,
        description: decl.description,
        abilities: decl.abilities,
      });
  }

  /** Self-discovery: find the Xurface user behind the Solution-side user id. */
  discoverUser(userRef: UserRef) {
    return this.call<DiscoveryResult>("POST", "/discovery/users", { user_ref: userRef });
  }

  // -- the three calls -------------------------------------------------------

  /** onXurface: evaluate the action (or sequence) against Horizon's scores and
   * the user's appetite. Returns the dynamic verdict (allowed or pending). */
  onXurface(req: IntentRequest) {
    return this.call<Intent>("POST", "/intents", req);
  }

  /** pushXurface: send a pending intent to the user's Xurface Discern. */
  pushXurface(intentId: string) {
    return this.call<{ ok: boolean }>("POST", `/intents/${intentId}/push`);
  }

  /** awaitXurface: long-poll for the human decision. */
  async awaitXurface(intentId: string, opts?: { timeoutMs?: number }): Promise<Intent> {
    const deadline = Date.now() + (opts?.timeoutMs ?? 300_000);
    for (;;) {
      const left = deadline - Date.now();
      if (left <= 0) throw new XurfaceError(`awaitXurface timed out for ${intentId}`);
      const intent = await this.call<Intent>(
        "GET", `/intents/${intentId}/await?timeout=${Math.min(left, 30_000)}`);
      if (intent.state !== "pending") return intent;
    }
  }

  /** guard: the three calls in one. Returns the decided intent or throws on deny. */
  async guard(req: IntentRequest, opts?: { timeoutMs?: number }): Promise<Intent> {
    const verdict = await this.onXurface(req);
    if (verdict.state === "allowed") return verdict;
    await this.pushXurface(verdict.id);
    const decided = await this.awaitXurface(verdict.id, opts);
    if (decided.state === "denied") {
      throw new XurfaceError(`denied by the user: ${req.capability}`, 403, decided);
    }
    return decided;
  }

  // -- the feedback loop -----------------------------------------------------

  /** Side effects: what users flagged or reported on this Solution. Calibrate
   * your declarations from these; a `report` is an undeclared action. */
  sideEffects() {
    return this.call<{ side_effects: SideEffect[] }>("GET", "/side-effects");
  }
}

function num(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
async function safeJson(res: Response): Promise<unknown> {
  try { return await res.json(); } catch { return undefined; }
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
