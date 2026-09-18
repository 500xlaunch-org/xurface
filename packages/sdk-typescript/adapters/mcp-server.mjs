#!/usr/bin/env node
/**
 * Xurface x MCP - the coding-agent adapter.
 *
 * This is a Model Context Protocol server (stdio JSON-RPC, zero dependencies)
 * that puts Horizon's discernment checkpoint in front of any coding agent that
 * speaks MCP: Claude Code, Cursor, Windsurf, Zed, or your own MCP client. The
 * agent calls `xurface_guard` before a critical action (deploy, delete, rotate a
 * key, open a PR, spend money); Horizon records it and, when it exceeds the
 * person's appetite, holds it for their approval in Xurface Discern. The tool
 * result tells the agent to proceed or to stop.
 *
 * Register with Claude Code (project .mcp.json or `claude mcp add`):
 *   {
 *     "mcpServers": {
 *       "xurface": {
 *         "command": "node",
 *         "args": ["sdk/typescript/adapters/mcp-server.mjs"],
 *         "env": {
 *           "XURFACE_CLIENT_ID": "cli_...",
 *           "XURFACE_CLIENT_SECRET": "xsk_...",
 *           "XURFACE_API_BASE": "https://xurface.500xlaunch.com",
 *           "XURFACE_AGENT": "coding-agent",
 *           "XURFACE_USER_REF": "email:you@company.com",
 *           "XURFACE_WAIT_MS": "120000"
 *         }
 *       }
 *     }
 *   }
 */

import { createInterface } from "node:readline";
import { Xurface } from "../xurface.mjs";

const cfg = {
  clientId: process.env.XURFACE_CLIENT_ID,
  clientSecret: process.env.XURFACE_CLIENT_SECRET,
  apiBase: process.env.XURFACE_API_BASE || "https://xurface.500xlaunch.com",
  agent: process.env.XURFACE_AGENT || "coding-agent",
  userRef: process.env.XURFACE_USER_REF || "", // "email:you@x.com" or "phone:+1..." or "external_id:.."
  waitMs: Number(process.env.XURFACE_WAIT_MS || 120_000),
};

const xf = cfg.clientId && cfg.clientSecret
  ? new Xurface({ clientId: cfg.clientId, clientSecret: cfg.clientSecret, apiBase: cfg.apiBase })
  : null;

const SERVER_INFO = { name: "xurface-guard", version: "0.1.0" };
const PROTOCOL_VERSION = "2024-11-05";

/** The tools this server exposes to the coding agent. */
const TOOLS = [
  {
    name: "xurface_guard",
    description:
      "Route a critical action through the Xurface Horizon discernment checkpoint BEFORE you perform it. " +
      "Call this for anything consequential and hard to reverse: deploying, deleting data, rotating a secret, " +
      "force-pushing, spending money, sending a message on the person's behalf. It records the action on a " +
      "signed audit ledger and, when the risk exceeds what the person tolerates, holds it for their approval on " +
      "their phone. Returns allowed:true only when you may proceed.",
    inputSchema: {
      type: "object",
      required: ["capability"],
      properties: {
        capability: { type: "string", description: "dotted action key, e.g. deploy.production, key.rotate, repo.force_push, pay.invoice" },
        details: { type: "object", description: "the concrete arguments of the action (target, amount, path, ...)" },
        user_ref: { type: "string", description: "override the person, as 'email:..'/'phone:..'/'external_id:..' (default from env)" },
      },
    },
  },
  {
    name: "xurface_declare_agent",
    description:
      "Declare this coding agent and the abilities it can perform so Horizon can score their risk. Call once at " +
      "the start of a session. Abilities is an array of { key, kind, description }.",
    inputSchema: {
      type: "object",
      required: ["abilities"],
      properties: {
        agent: { type: "string" },
        display_name: { type: "string" },
        abilities: { type: "array", items: { type: "object" } },
      },
    },
  },
];

async function callTool(name, args) {
  if (!xf) throw new Error("XURFACE_CLIENT_ID / XURFACE_CLIENT_SECRET not set");
  if (name === "xurface_declare_agent") {
    const agent = args.agent || cfg.agent;
    const out = await xf.declareAgent(agent, {
      display_name: args.display_name || agent, abilities: args.abilities || [],
    });
    return { declared: agent, abilities: out.abilities };
  }
  if (name === "xurface_guard") {
    const ref = parseRef(args.user_ref || cfg.userRef);
    if (!ref) throw new Error("no user_ref: pass user_ref or set XURFACE_USER_REF");
    const user = await xf.resolveUser(ref.type, ref.value);
    if (!user) return { allowed: false, state: "unlinked", reason: `${ref.type} ${ref.value} has not linked this Solution in Xurface Discern` };
    const g = await xf.guard({ user, agent: cfg.agent, capability: args.capability, details: args.details || {}, wait: cfg.waitMs });
    return {
      allowed: g.allowed, state: g.state, severity: g.severity, risk: g.risk,
      reasons: g.reasons, intent: g.intentId,
      guidance: g.allowed ? "You may proceed with this action." : "Do NOT proceed. The person did not approve this action.",
    };
  }
  throw new Error(`unknown tool ${name}`);
}

function parseRef(s) {
  const i = String(s || "").indexOf(":");
  if (i < 0) return null;
  return { type: s.slice(0, i), value: s.slice(i + 1) };
}

// -- minimal MCP stdio JSON-RPC loop ----------------------------------------

function write(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function reply(id, result) { write({ jsonrpc: "2.0", id, result }); }
function fail(id, code, message) { write({ jsonrpc: "2.0", id, error: { code, message } }); }

async function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      return reply(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
    case "notifications/initialized":
    case "initialized":
      return; // notification, no reply
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: TOOLS });
    case "prompts/list":
      return reply(id, { prompts: [] });
    case "resources/list":
      return reply(id, { resources: [] });
    case "tools/call": {
      try {
        const out = await callTool(params?.name, params?.arguments || {});
        return reply(id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], isError: !(out.allowed ?? true) && params?.name === "xurface_guard" ? false : false });
      } catch (e) {
        return reply(id, { content: [{ type: "text", text: `xurface error: ${e.message}` }], isError: true });
      }
    }
    default:
      if (id != null) return fail(id, -32601, `method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const s = line.trim();
  if (!s) return;
  let msg;
  try { msg = JSON.parse(s); } catch { return; }
  Promise.resolve(handle(msg)).catch((e) => { if (msg?.id != null) fail(msg.id, -32603, e.message); });
});

process.stderr.write(`xurface MCP server ready (api ${cfg.apiBase}, agent ${cfg.agent})\n`);
