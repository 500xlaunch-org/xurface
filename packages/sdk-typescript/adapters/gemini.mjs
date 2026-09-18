/**
 * Xurface x Google Gemini (function calling) adapter.
 *
 * This adapter exists as the worked example in CONTRIBUTING: it shows how to add
 * support for a new agent framework in ~40 lines by mapping that framework's
 * tool abstraction onto `runGuarded`. Nothing framework-specific leaks into the
 * core - a contributor writes one small file like this and a contract test.
 *
 * Gemini returns `functionCall` parts ({ name, args }); your app replies with a
 * `functionResponse` part. This adapter records every function call in Horizon
 * and holds the risky ones for the person's discernment in Xurface Discern
 * before the tool runs. A held / denied call comes back as an ordinary
 * functionResponse the model can read.
 *
 * @example
 *   const guard = createGeminiGuard(xf, { user: xid, agent: "apply-bot", wait: 120000 });
 *   const reg = guard.register([{
 *     name: "send_reply", description: "Email a recruiter back",
 *     parameters: { type: "object", properties: { to: { type: "string" } } },
 *     capability: "reply.send", run: async ({ to }) => sendEmail(to),
 *   }]);
 *   // ... put reg.geminiTools in your generateContent request ...
 *   for (const part of candidate.content.parts)
 *     if (part.functionCall) responses.push(await reg.dispatch(part.functionCall));
 */

import { runGuarded } from "../xurface.mjs";

/**
 * @param {import("../xurface.mjs").Xurface} xf
 * @param {{user:string, agent:string, wait?:number}} ctx
 */
export function createGeminiGuard(xf, ctx) {
  return {
    /**
     * @param {Array<{name:string, description?:string, parameters?:object,
     *   capability?:string, run:(args:any)=>any}>} tools
     */
    register(tools) {
      const byName = new Map(tools.map((t) => [t.name, t]));

      // Gemini expects tools as [{ functionDeclarations: [...] }]
      const geminiTools = [{
        functionDeclarations: tools.map((t) => ({
          name: t.name, description: t.description || "",
          parameters: t.parameters || { type: "object", properties: {} },
        })),
      }];

      /**
       * Guard + run one functionCall. Returns a Gemini functionResponse part.
       * @param {{name:string, args:object}} functionCall
       */
      async function dispatch(functionCall) {
        const tool = byName.get(functionCall.name);
        if (!tool) return responsePart(functionCall.name, { error: `unknown tool ${functionCall.name}` });

        const out = await runGuarded(xf, {
          user: ctx.user, agent: ctx.agent, capability: tool.capability || functionCall.name,
          args: functionCall.args || {}, wait: ctx.wait,
        }, (finalArgs) => tool.run(finalArgs));

        if (out.ok) return responsePart(functionCall.name, { ok: true, result: out.result, xurface: meta(out.guard) });
        return responsePart(functionCall.name, { ok: false, blocked: true, reason: out.message, xurface: meta(out.guard) });
      }

      return { geminiTools, dispatch, tools: byName };
    },
  };
}

function responsePart(name, response) {
  return { functionResponse: { name, response } };
}

function meta(guard) {
  return { state: guard.state, severity: guard.severity, intent: guard.intentId, reasons: guard.reasons };
}
