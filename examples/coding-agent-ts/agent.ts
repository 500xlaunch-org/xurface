/**
 * A coding agent that asks before it force-pushes.
 * Run: node --experimental-strip-types agent.ts
 */
import { Xurface, XurfaceError } from "../../packages/sdk-typescript/src/index.ts";

const xf = Xurface.fromSpec();

// declare once: identity + what this agent can do on behalf of the user
await xf.declareAgent("coding-agent", {
  displayName: "Coding Agent",
  description: "Maintains your repositories while you are away.",
  abilities: [
    { key: "git.commit", kind: "tool", criticity: "LOW", description: "Commit on a branch" },
    { key: "git.open_pr", kind: "tool", criticity: "MEDIUM", description: "Open a pull request" },
    { key: "git.force_push", kind: "tool", criticity: "HIGH", description: "Force-push a branch" },
    { key: "repo.delete", kind: "tool", criticity: "SEVERE", description: "Delete a repository" },
  ],
});

// self-discovery: the email this workspace already knows
const found = await xf.discoverUser({ type: "email", value: process.env.USER_EMAIL ?? "ada@example.com" });
if (found.status !== "linked") {
  console.log(`discovery: ${found.status}. The user approves the link in Xurface Discern first.`);
  process.exit(0);
}

// routine work passes silently (still logged and audited)
await xf.onXurface({ user: found.user!, agent: "coding-agent", capability: "git.commit",
  details: { repo: "acme/api", branch: "fix/timeout" } });

// the consequential moment: one card on the phone, then continue
try {
  const ok = await xf.guard({
    user: found.user!,
    agent: "coding-agent",
    capability: "git.force_push",
    details: { repo: "acme/api", branch: "main", commits_dropped: 2 },
  });
  console.log(`user said ${ok.state}; force-pushing now`);
} catch (e) {
  if (e instanceof XurfaceError && e.status === 403) {
    console.log("user denied the force-push; leaving the branch as is");
  } else throw e;
}
