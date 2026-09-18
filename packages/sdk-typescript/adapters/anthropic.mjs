/**
 * Xurface x Anthropic (Claude tool use) adapter.
 *
 * Claude returns `tool_use` content blocks; your app runs each tool and replies
 * with a `tool_result` block. This adapter records every tool use in Horizon and
 * holds the risky ones for the person's discernment in Xurface Discern before
 * the tool runs. A held or denied call returns a `tool_result` marked as an
 * error, so Claude sees it could not act and can explain or wait.
 *
 * Works with the `@anthropic-ai/sdk` Messages API and with Claude Agent SDK
 * tool loops. The adapter does not call the model; it guards the tools.
 *
 * @example
 *   const guard = createAnthropicGuard(xf, { user: xid, agent: "narrator", wait: 120000 });
 *   const reg = guard.register([{
 *     name: "publish_brief", description: "Publish the competitive brief",
 *     input_schema: { type: "object", properties: { url: { type: "string" } } },
 *     capability: "brief.publish",
 *     run: async ({ url }) => publish(url),
 *   }]);
 *   // ... send reg.anthropicTools in your messages.create request ...
 *   for (const block of message.content)
 *     if (block.type === "tool_use") results.push(await reg.dispatch(block));
 */

import { runGuarded } from "../xurface.mjs";

/**
 * @param {import("../xurface.mjs").Xurface} xf
 * @param {{user:string, agent:string, wait?:number}} ctx
 */
export function createAnthropicGuard(xf, ctx) {
  return {
    /**
     * @param {Array<{name:string, description?:string, input_schema?:object,
     *   capability?:string, run:(args:any)=>any}>} tools
     */
    register(tools) {
      const byName = new Map(tools.map((t) => [t.name, t]));

      /** The tools array to put in your Anthropic messages.create request. */
      const anthropicTools = tools.map((t) => ({
        name: t.name, description: t.description || "",
        input_schema: t.input_schema || { type: "object", properties: {} },
      }));

      /**
       * Guard + run one tool_use block. Returns a Claude tool_result block.
       * @param {{type:"tool_use", id:string, name:string, input:object}} block
       */
      async function dispatch(block) {
        const tool = byName.get(block.name);
        if (!tool) return toolResult(block.id, { error: `unknown tool ${block.name}` }, true);

        const out = await runGuarded(xf, {
          user: ctx.user, agent: ctx.agent, capability: tool.capability || block.name,
          args: block.input || {}, wait: ctx.wait,
        }, (finalArgs) => tool.run(finalArgs));

        if (out.ok) return toolResult(block.id, { ok: true, result: out.result, xurface: xurfaceMeta(out.guard) }, false);
        return toolResult(block.id, { ok: false, blocked: true, reason: out.message, xurface: xurfaceMeta(out.guard) }, true);
      }

      return { anthropicTools, dispatch, tools: byName };
    },
  };
}

function toolResult(tool_use_id, payload, isError) {
  return { type: "tool_result", tool_use_id, is_error: isError, content: JSON.stringify(payload) };
}

function xurfaceMeta(guard) {
  return { state: guard.state, severity: guard.severity, intent: guard.intentId, reasons: guard.reasons };
}
