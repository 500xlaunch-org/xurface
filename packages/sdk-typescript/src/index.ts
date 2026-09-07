/**
 * Xurface SDK for TypeScript.
 *
 * Manifest in, three calls out:
 *
 *   const xf = await Xurface.fromSpec("./xurface-solution.json");
 *   await xf.declareAgent("apply-bot", { displayName: "Apply Bot", abilities: [...] });
 *   const { user } = await xf.discoverUser({ type: "email", value: "ada@example.com" });
 *   const ok = await xf.guard({ user, agent: "apply-bot", capability: "reply.send",
 *                               details: { to: "hr@corp.com" } });
 *
 * Zero dependencies. Node 18+ (global fetch).
 * License: Apache-2.0.
 */

import { readFileSync } from "node:fs";

export type Criticity = "LOW" | "MEDIUM" | "HIGH" | "SEVERE";
export type AbilityKind = "skill" | "tool" | "capability";
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

export interface Ability {
  key: string;
  kind: AbilityKind;
  criticity: Criticity;
  description?: string;
  requires_auth?: string[];
  schema?: Record<string, unknown>;
}

export interface AgentDeclaration {
  displayName?: string;
  logo?: string;
  description?: string;
  abilities?: Ability[];
}

export interface UserRef { type: "email" | "phone" | "external_id"; value: string }

export interface DiscoveryResult {
  status: "linked" | "pending" | "none";
  user?: string;      // pairwise id xid_...
  link?: string;
  threshold?: Criticity;
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
  criticity: Criticity;
  token?: string;     // present on allowed/approved
  decision?: Decision;
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

  /** Declare the agent: identity + what it can do on behalf of the user. Idempotent. */
  declareAgent(agentId: string, decl: AgentDeclaration) {
    return this.call<{ agent: string; abilities: Array<{ key: string; criticity: Criticity; status: string }> }>(
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

  /** onXurface: classify the action (or sequence) and evaluate the one rule. */
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
    const risk = await this.onXurface(req);
    if (risk.state === "allowed") return risk;
    await this.pushXurface(risk.id);
    const decided = await this.awaitXurface(risk.id, opts);
    if (decided.state === "denied") {
      throw new XurfaceError(`denied by the user: ${req.capability}`, 403, decided);
    }
    return decided;
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
