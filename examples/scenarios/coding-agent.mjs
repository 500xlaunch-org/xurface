/**
 * Scenario: a CODING agent (Claude Code / Cursor / an in-house dev bot).
 *
 * The agent reads code, runs tests and ships to staging on its own. The moves
 * that can hurt - a force-push, a production deploy, dropping a table - go to the
 * engineer's phone. The production deploy is approved (with a biometric, because
 * it scores SEVERE); dropping a table is denied.
 *
 * In production a coding agent reaches Horizon through the MCP server
 * (@xurface/sdk/mcp-server); here we call guard() directly for clarity.
 */

import { connect, playPhone, show, header } from "./_harness.mjs";

const { xf, person, xid } = await connect({ appetite: { system: "HIGH" } }); // trust staging; ask above it

await xf.declareAgent("coding-agent", {
  display_name: "Coding Agent",
  abilities: [
    { key: "repo.read",         kind: "skill",      description: "Read files in the working tree" },
    { key: "test.run",          kind: "skill",      description: "Run the test suite" },
    { key: "deploy.staging",    kind: "capability", description: "Deploy the build to staging" },
    { key: "repo.force_push",   kind: "capability", description: "Force-push a branch", discernment: "always" },
    { key: "deploy.production", kind: "capability", description: "Deploy the API to production" },
    { key: "db.table_drop",     kind: "capability", description: "Drop a database table" },
  ],
});

// the engineer's phone: approve the deploys and the force-push, refuse the table drop
const stop = playPhone(person, (i) => (i.capability === "db.table_drop" ? "deny" : "approve"));
const g = (label, capability, details) =>
  xf.guard({ user: xid, agent: "coding-agent", capability, details, wait: 8000 }).then((r) => show(label, r));

header("Coding agent :: ship a change", "routine dev work flows; the dangerous moves ask the engineer.");
await g("read the repo", "repo.read", { path: "src/" });
await g("run the tests", "test.run", {});
await g("deploy to staging", "deploy.staging", { build: "a1b2c3" });
await g("force-push a branch", "repo.force_push", { branch: "feature/x", commits: 3 });
await g("deploy to PRODUCTION", "deploy.production", { build: "a1b2c3", service: "api" });
await g("drop a database table", "db.table_drop", { table: "invoices" });

await stop();
console.log("\nEverything above is on Horizon's audit ledger. Routine work never interrupted the engineer;\nthe consequential moves did, and one was refused.\n");
