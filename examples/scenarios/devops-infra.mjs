/**
 * Scenario: an SRE / DevOps agent (Google Gemini function calling).
 *
 * The agent reads metrics on its own and can scale or restart a service with the
 * on-call engineer's approval. Deleting a namespace scores SEVERE and is denied.
 *
 * Shows the Gemini adapter: functionCall parts are guarded before the tool runs;
 * a held/denied one comes back as a functionResponse the model can read.
 */

import { connect, playPhone, header } from "./_harness.mjs";
import { createGeminiGuard } from "../../packages/sdk-typescript/index.mjs";

const { xf, person, xid } = await connect({ appetite: { system: "LOW", data: "MEDIUM" } });

await xf.declareAgent("sre-agent", {
  display_name: "SRE Agent",
  abilities: [
    { key: "metrics.read",     kind: "skill",      description: "Read service health metrics" },
    { key: "service.scale",    kind: "capability", description: "Scale a service up or down" },
    { key: "service.restart",  kind: "capability", description: "Restart a service" },
    { key: "namespace.delete", kind: "capability", description: "Delete a namespace" },
  ],
});

// the on-call phone: approve scale/restart, refuse the namespace delete
const stop = playPhone(person, (i) => (i.capability === "namespace.delete" ? "deny" : "approve"));

const guard = createGeminiGuard(xf, { user: xid, agent: "sre-agent", wait: 8000 });
const reg = guard.register([
  { name: "get_metrics",      capability: "metrics.read",     run: () => ({ cpu: 0.86, p99_ms: 240 }) },
  { name: "scale_service",    capability: "service.scale",    run: ({ to }) => `scaled to ${to}` },
  { name: "restart_service",  capability: "service.restart",  run: ({ name }) => `restarted ${name}` },
  { name: "delete_namespace", capability: "namespace.delete", run: ({ ns }) => `deleted ${ns}` },
]);

const call = (name, args) => reg.dispatch({ name, args });
const say = (label, part) => { const r = part.functionResponse.response; console.log(`  ${r.ok ? "ALLOW" : "BLOCK"}  ${label.padEnd(30)} ${(r.xurface && r.xurface.state) || (r.blocked ? "held/denied" : "")}`); };

header("SRE agent :: handle a CPU spike", "reading is free; changing the fleet asks on-call; destroying is refused.");
say("read the metrics",        await call("get_metrics",      {}));
say("scale api to 8 replicas", await call("scale_service",    { name: "api", to: 8 }));
say("restart the worker",      await call("restart_service",  { name: "worker" }));
say("delete the prod namespace", await call("delete_namespace", { ns: "prod" }));

await stop();
console.log("\nThe agent mitigated the spike with approval; deleting the namespace was refused (SEVERE, never delegated).\n");
