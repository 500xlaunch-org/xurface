/**
 * Scenario: a PERSONAL-FINANCE agent (OpenAI tool calling).
 *
 * The assistant categorizes expenses on its own. Moving money is held for the
 * person: a small invoice is approved, a large one is denied, a transfer to a
 * known payee is approved, and a big transfer to a new payee is refused.
 *
 * Shows the OpenAI adapter: the model's tool_calls are guarded before the tool
 * body runs, and a held/denied call comes back as an ordinary tool message.
 */

import { connect, playPhone, header } from "./_harness.mjs";
import { createOpenAIGuard } from "../../packages/sdk-typescript/index.mjs";

const { xf, person, xid } = await connect({ appetite: { financial: "LOW" } });

await xf.declareAgent("finance-assistant", {
  display_name: "Finance Assistant",
  abilities: [
    { key: "expense.categorize", kind: "skill",      description: "Categorize an expense" },
    { key: "pay.invoice",        kind: "capability", description: "Pay an invoice" },
    { key: "funds.transfer",     kind: "capability", description: "Transfer funds to a payee" },
  ],
});

// the person's phone: refuse invoices over $1,000 and transfers over $5,000 or to a new payee
const stop = playPhone(person, (i) => {
  const a = (i.details && i.details.amount) || 0;
  if (i.capability === "pay.invoice"   && a > 1000) return "deny";
  if (i.capability === "funds.transfer" && (a > 5000 || (i.details && i.details.new_payee))) return "deny";
  return "approve";
});

const guard = createOpenAIGuard(xf, { user: xid, agent: "finance-assistant", wait: 8000 });
let paid = 0, transferred = 0;
const reg = guard.register([
  { name: "categorize_expense", capability: "expense.categorize", run: () => ({ category: "software" }) },
  { name: "pay_invoice",        capability: "pay.invoice",        run: ({ amount }) => { paid += amount; return `paid ${amount}`; } },
  { name: "transfer_funds",     capability: "funds.transfer",     run: ({ amount }) => { transferred += amount; return `transferred ${amount}`; } },
]);

// simulate the OpenAI tool_calls the model would emit
const call = (name, args) => reg.dispatch({ id: "c_" + Math.random().toString(36).slice(2, 8), function: { name, arguments: JSON.stringify(args) } });
const say = (label, msg) => { const b = JSON.parse(msg.content); console.log(`  ${b.ok ? "ALLOW" : "BLOCK"}  ${label.padEnd(30)} ${(b.xurface && b.xurface.state) || ""}`); };

header("Finance assistant :: pay the week's bills", "categorizing is free; every dollar out is the person's call.");
say("categorize an expense",         await call("categorize_expense", { merchant: "GitHub" }));
say("pay a $180 invoice",            await call("pay_invoice",        { vendor: "Acme", amount: 180 }));
say("pay a $50,000 invoice",         await call("pay_invoice",        { vendor: "Unknown LLC", amount: 50000 }));
say("transfer $200 to landlord",     await call("transfer_funds",     { payee: "landlord", amount: 200 }));
say("transfer $9,000 to a new payee", await call("transfer_funds",    { payee: "new-account", amount: 9000, new_payee: true }));

await stop();
console.log(`\nMoney that actually moved: $${paid} paid, $${transferred} transferred. The rest was refused on the phone.\n`);
