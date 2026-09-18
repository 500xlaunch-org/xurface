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
  sideEffects(): Promise<{ side_effects: any[] }>;
}

export function runGuarded<T>(
  xf: Xurface,
  call: { user: string; agent: string; capability: string; args?: Record<string, unknown>; wait?: number },
  exec: (args: Record<string, unknown>) => Promise<T> | T,
): Promise<{ ok: boolean; guard: GuardResult; result?: T; message: string }>;

export interface ConsumerOptions { apiBase?: string; token?: string; fetch?: typeof fetch }
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
