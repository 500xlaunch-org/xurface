// Type definitions for @xurface/sdk

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "SEVERE";
export type RiskCategory =
  | "identity" | "financial" | "location" | "intellectual"
  | "conversation" | "data" | "system";
export type RiskProfile = Partial<Record<RiskCategory, Severity>>;
export type AbilityKind = "skill" | "tool" | "capability";
export type DiscernmentPolicy = "auto" | "always" | "never";
export type IntentState =
  | "allowed" | "approved" | "edited" | "pending" | "denied" | "expired";

export interface AbilityDeclaration {
  key: string;
  kind: AbilityKind;
  description?: string;
  requires_auth?: string[];
  schema?: unknown;
  developer_risk?: RiskProfile | Severity;
  discernment?: DiscernmentPolicy;
}

export interface AgentDeclaration {
  display_name?: string;
  description?: string;
  logo?: string;
  abilities?: AbilityDeclaration[];
}

export interface GuardParams {
  user: string;
  agent: string;
  capability: string;
  details?: Record<string, unknown>;
  sequence?: Array<{ capability: string; details?: Record<string, unknown>; input_request?: string }>;
  wait?: number;
  push?: boolean;
}

export interface GuardResult {
  allowed: boolean;
  state: IntentState;
  intentId: string;
  severity: Severity;
  risk: RiskProfile;
  reasons: string[];
  token?: string;
  details?: Record<string, unknown>;
  decision?: unknown;
}

export interface XurfaceOptions {
  clientId: string;
  clientSecret: string;
  apiBase?: string;
  env?: "test" | "live";
  fetch?: typeof fetch;
  onLog?: (evt: { level: string; msg: string; data?: unknown }) => void;
}

export class XurfaceError extends Error {
  status: number;
  body?: unknown;
  constructor(status: number, message: string, body?: unknown);
}

export class Xurface {
  constructor(opts: XurfaceOptions);
  static fromManifest(manifest: any, extra?: Partial<XurfaceOptions>): Xurface;
  apiBase: string;
  taxonomy(): Promise<any>;
  limits(): Promise<any>;
  declareAgent(agentId: string, decl: AgentDeclaration): Promise<{ agent: string; abilities: any[] }>;
  discover(type: "email" | "phone" | "external_id", value: string): Promise<any>;
  resolveUser(type: "email" | "phone" | "external_id", value: string): Promise<string | null>;
  guard(p: GuardParams): Promise<GuardResult>;
  /** Name an adapter wrapping this client, so its use shows on your Solution's page. */
  useAdapter(name: string): this;
  /** Ask without blocking; it waits up to ttlHours (1 to 168) for the person. */
  ask(p: { user: string; agent: string; capability: string; summary?: string; context?: string; if_blocked?: string; details?: any; ttlHours?: number }): Promise<any>;
  /** Where a request stands now, without waiting. */
  intent(intentId: string): Promise<any>;
  /** Ring the person's devices again for something already asked. */
  push(intentId: string): Promise<any>;
  /** Take back a question that no longer matters. */
  withdraw(intentId: string): Promise<any>;
  /** Ask for something from the person's vault ("bundle" lets them choose several), sealed to your release key. */
  requestCredential(p: { user: string; agent: string; type: string; reason: string; purpose?: string; ttlHours?: number }): Promise<any>;
  /** What they released, once: an envelope sealed to your release key. */
  collect(intentId: string): Promise<{ intent: string; alg: string; ephemeral: string; salt: string; iv: string; ct: string }>;
  /** The key a person published so things can be handed to them sealed. */
  receiveKey(user: string): Promise<{ key: string; at: number }>;
  /** Hand a person something sealed to their receive key; they accept it into their vault. */
  deliver(p: { user: string; agent: string; title: string; from: string; count: number; reason: string; envelope: { alg: string; ephemeral: string; salt: string; iv: string; ct: string }; ttlHours?: number }): Promise<any>;
  /** When a linked person last used Discern, to the hour (requires the presence.read ability). */
  presence(user: string): Promise<{ user: string; seen_at: number | null }>;
  /** Finish a connection the person started in Discern and signed in for on your connect page. */
  connectComplete(session: string): Promise<{ user: string; status: "linked" }>;
  sideEffects(): Promise<{ side_effects: any[] }>;
}

export function runGuarded<T>(
  xf: Xurface,
  call: { user: string; agent: string; capability: string; args?: Record<string, unknown>; wait?: number },
  exec: (args: Record<string, unknown>) => Promise<T> | T,
): Promise<{ ok: boolean; guard: GuardResult; result?: T; message: string }>;

export interface ConsumerOptions { apiBase?: string; token?: string; env?: "test" | "live"; fetch?: typeof fetch }
export class XurfaceConsumer {
  constructor(opts?: ConsumerOptions);
  token: string | null;
  login(email: string, name?: string): Promise<any>;
  registerDevice(platform: "ios" | "android" | "web", token: string, label?: string): Promise<any>;
  solutions(): Promise<any>;
  addSolution(solutionUid: string, type: string, value: string): Promise<any>;
  setAppetite(linkId: string, appetite: RiskProfile): Promise<any>;
  setLinkStatus(linkId: string, status: "active" | "paused" | "revoked"): Promise<any>;
  inbox(): Promise<any[]>;
  timeline(): Promise<any[]>;
  decide(intentId: string, decision: "approve" | "approve_all" | "deny",
    opts?: { step?: number; input?: string; edited_details?: object; biometric?: boolean }): Promise<any>;
  flag(intentId: string, reason: string, suggested?: RiskProfile): Promise<any>;
  report(solutionUid: string, reason: string, extra?: object): Promise<any>;
  approveLink(): Promise<number>;
}

// -- adapters (each takes the Xurface client + a per-run context) ----------
export interface GuardCtx { user: string; agent: string; wait?: number }

export function createOpenAIGuard(xf: Xurface, ctx: GuardCtx): {
  register(tools: Array<{ name: string; description?: string; parameters?: object; capability?: string; run: (args: any) => any }>): {
    openaiTools: any[]; dispatch(toolCall: any): Promise<any>; tools: Map<string, any>;
  };
};
export function createAnthropicGuard(xf: Xurface, ctx: GuardCtx): {
  register(tools: Array<{ name: string; description?: string; input_schema?: object; capability?: string; run: (args: any) => any }>): {
    anthropicTools: any[]; dispatch(block: any): Promise<any>; tools: Map<string, any>;
  };
};
export function createGeminiGuard(xf: Xurface, ctx: GuardCtx): {
  register(tools: Array<{ name: string; description?: string; parameters?: object; capability?: string; run: (args: any) => any }>): {
    geminiTools: any[]; dispatch(functionCall: any): Promise<any>; tools: Map<string, any>;
  };
};
