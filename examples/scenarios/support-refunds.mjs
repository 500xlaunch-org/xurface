/**
 * Scenario: a CUSTOMER-SUPPORT agent (Anthropic Claude tool use).
 *
 * The bot looks up orders and replies to customers on its own. Issuing a refund
 * is held for an agent: a small goodwill refund is approved, a large one is
 * denied.
 *
 * Shows the Anthropic adapter: Claude's tool_use blocks are guarded before the
 * tool runs; a held/denied one becomes a tool_result the model can read.
 */

import { connect, playPhone, header } from "./_harness.mjs";
import { createAnthropicGuard } from "../../packages/sdk-typescript/index.mjs";

const { xf, person, xid } = await connect({ appetite: { financial: "LOW", conversation: "MEDIUM" } });

await xf.declareAgent("support-bot", {
  display_name: "Support Bot",
  abilities: [
    { key: "order.lookup",    kind: "skill",      description: "Look up a customer order" },
    { key: "customer.reply",  kind: "tool",       description: "Reply to the customer" },
    { key: "refund.issue",    kind: "capability", description: "Issue a refund to a customer" },
  ],
});

// the human agent's phone: approve refunds up to $100, refuse anything larger
const stop = playPhone(person, (i) =>
  (i.capability === "refund.issue" && (i.details && i.details.amount) > 100) ? "deny" : "approve");

const guard = createAnthropicGuard(xf, { user: xid, agent: "support-bot", wait: 8000 });
const reg = guard.register([
  { name: "lookup_order",   capability: "order.lookup",   run: ({ id }) => ({ id, status: "delivered" }) },
  { name: "reply_customer", capability: "customer.reply", run: () => "sent" },
  { name: "issue_refund",   capability: "refund.issue",   run: ({ amount }) => `refunded ${amount}` },
]);

const call = (name, input) => reg.dispatch({ type: "tool_use", id: "tu_" + Math.random().toString(36).slice(2, 8), name, input });
const say = (label, block) => { const b = JSON.parse(block.content); console.log(`  ${b.ok ? "ALLOW" : "BLOCK"}  ${label.padEnd(30)} ${(b.xurface && b.xurface.state) || (b.blocked ? "held/denied" : "")}`); };

header("Support bot :: work a ticket", "answering the customer is free; money back is a person's call.");
say("look up the order",        await call("lookup_order",   { id: "ORD-4471" }));
say("reply to the customer",    await call("reply_customer", { text: "Your order was delivered Tuesday." }));
say("issue a $25 goodwill refund", await call("issue_refund", { amount: 25 }));
say("issue a $1,500 refund",    await call("issue_refund",   { amount: 1500 }));

await stop();
console.log("\nThe bot resolved the ticket and made a small refund; the large refund was refused on the phone.\n");
