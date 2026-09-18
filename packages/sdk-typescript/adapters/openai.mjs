/**
 * Xurface x OpenAI (function / tool calling) adapter.
 *
 * OpenAI models return `tool_calls`; your app runs each tool by name and hands
 * back a tool message. This adapter inserts Horizon between the model's request
 * and the real tool body: every tool call is recorded, and a call whose risk
 * exceeds the person's appetite is held for their discernment in Xurface Discern
 * before the tool ever runs. A denied or still-pending call comes back as an
 * ordinary tool message, so the model simply sees that it could not proceed.
 *
 * Works with the `openai` SDK and with the Agents SDK - anywhere you dispatch
 * `tool_calls`. The adapter does not call OpenAI itself; it guards the tools.
 *
 * @example
 *   const guard = createOpenAIGuard(xf, { user: xid, agent: "apply-bot", wait: 120000 });
 *   const tools = [{
 *     name: "send_reply", description: "Email a recruiter back",
 *     parameters: { type: "object", properties: { to: {type:"string"}, body:{type:"string"} } },
 *     capability: "reply.send",
 *     run: async ({ to, body }) => sendEmail(to, body),
 *   }];
 *   const reg = guard.register(tools);
 *   // ... send reg.openaiTools in your chat.completions request ...
 *   for (const call of message.tool_calls) toolMessages.push(await reg.dispatch(call));
 */

import { runGuarded } from "../xurface.mjs";

/**
 * @param {import("../xurface.mjs").Xurface} xf
 * @param {{user:string, agent:string, wait?:number}} ctx
 */
export function createOpenAIGuard(xf, ctx) {
  return {
    /**
     * @param {Array<{name:string, description?:string, parameters?:object,
     *   capability?:string, run:(args:any)=>any}>} tools
     */
    register(tools) {
      const byName = new Map(tools.map((t) => [t.name, t]));

      /** The tools array to put in your OpenAI request (schema only). */
      const openaiTools = tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description || "", parameters: t.parameters || { type: "object", properties: {} } },
      }));

      /**
       * Guard + run one tool_call. Returns an OpenAI tool message.
       * @param {{id:string, function:{name:string, arguments:string}}} toolCall
       */
      async function dispatch(toolCall) {
        const name = toolCall.function?.name;
        const tool = byName.get(name);
        let args = {};
        try { args = JSON.parse(toolCall.function?.arguments || "{}"); } catch { /* leave {} */ }
        if (!tool) {
          return toolMessage(toolCall.id, name, { error: `unknown tool ${name}` });
        }
        const out = await runGuarded(xf, {
          user: ctx.user, agent: ctx.agent, capability: tool.capability || name,
          args, wait: ctx.wait,
        }, (finalArgs) => tool.run(finalArgs));

        if (out.ok) return toolMessage(toolCall.id, name, { ok: true, result: out.result, xurface: xurfaceMeta(out.guard) });
        return toolMessage(toolCall.id, name, { ok: false, blocked: true, reason: out.message, xurface: xurfaceMeta(out.guard) });
      }

      return { openaiTools, dispatch, tools: byName };
    },
  };
}

function toolMessage(tool_call_id, name, payload) {
  return { role: "tool", tool_call_id, name, content: JSON.stringify(payload) };
}

function xurfaceMeta(guard) {
  return { state: guard.state, severity: guard.severity, intent: guard.intentId, reasons: guard.reasons };
}
