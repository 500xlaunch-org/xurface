/**
 * Shared harness for the scenario examples.
 *
 * Each scenario connects to Horizon with your Solution credentials, links a demo
 * person, and (for an unattended demo) plays that person's Xurface Discern phone
 * with a policy you pass. In real life the person taps Approve / Edit / Deny on
 * their device; here `playPhone` stands in so the whole loop runs on its own.
 *
 * Env:
 *   XURFACE_API_BASE       Horizon base URL (default https://xurface.500xlaunch.com)
 *   XURFACE_CLIENT_ID      your Solution client id
 *   XURFACE_CLIENT_SECRET  your Solution client secret
 *   XURFACE_USER           the person's email (default demo@xurface.dev)
 */

import { Xurface, XurfaceConsumer } from "../../packages/sdk-typescript/index.mjs";

const API = process.env.XURFACE_API_BASE || "https://xurface.500xlaunch.com";
const USER = process.env.XURFACE_USER || "demo@xurface.dev";

export async function connect({ appetite } = {}) {
  const clientId = process.env.XURFACE_CLIENT_ID;
  const clientSecret = process.env.XURFACE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Set XURFACE_CLIENT_ID and XURFACE_CLIENT_SECRET (register a Solution in Horizon first).");
    process.exit(2);
  }
  const xf = new Xurface({ apiBase: API, clientId, clientSecret });
  const person = new XurfaceConsumer({ apiBase: API });
  await person.login(USER, "Demo Person");
  let d = await xf.discover("email", USER);          // creates a pending link on first run
  if (d.status === "pending") { await person.approveLink(); d = await xf.discover("email", USER); }
  if (appetite) await person.setAppetite(person.__lastLink = d.link, appetite);
  const xid = await xf.resolveUser("email", USER);
  return { xf, person, xid, link: d.link, api: API, user: USER };
}

/**
 * Auto-decide the person's inbox. `policy(intent)` returns "approve" | "deny" |
 * { decision, edited }. SEVERE approvals get a biometric assertion automatically.
 * Returns a stop() you await when the scenario is done.
 */
export function playPhone(person, policy) {
  let stop = false;
  const seen = new Set();
  const loop = (async () => {
    while (!stop) {
      for (const i of await person.inbox()) {
        if (i.kind !== "action" || seen.has(i.id)) continue;
        seen.add(i.id);
        let d = policy(i) || "approve";
        const decision = typeof d === "string" ? d : d.decision;
        const opts = {};
        if (typeof d === "object" && d.edited) opts.edited_details = d.edited;
        if (decision !== "deny" && i.severity === "SEVERE") opts.biometric = true;
        await person.decide(i.id, decision, opts);
        console.log(`      [Discern] ${decision.toUpperCase()}${opts.biometric ? "+biometric" : ""} ${i.capability}`);
      }
      await new Promise((r) => setTimeout(r, 40));
    }
  })();
  return async () => { stop = true; await loop; };
}

/** Print one guarded step the way an audit reviewer would read it. */
export function show(label, g) {
  const mark = g.allowed ? "ALLOW" : (g.state === "denied" ? "BLOCK" : "HELD ");
  console.log(`  ${mark}  ${label.padEnd(26)} ${g.state.padEnd(9)} ${g.severity.padEnd(6)} ${(g.reasons && g.reasons[0]) || ""}`);
  return g;
}

export function header(title, subtitle) {
  console.log(`\n== ${title} ==`);
  if (subtitle) console.log(subtitle);
}
