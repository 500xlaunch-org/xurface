#!/usr/bin/env node
/**
 * create-xurface-sdk: scaffold a Xurface SDK project from a Horizon Solution
 * Manifest. Kinds: skills | tools | capabilities. Langs: ts | py.
 * Zero dependencies. License: Apache-2.0.
 *
 *   npx create-xurface-sdk my-sdk --kind tools --lang ts --spec ./xurface-solution.json
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d;
};
const kind = opt("kind", "tools");
const lang = opt("lang", "ts");
const specPath = opt("spec");
const force = args.includes("--force");

function die(msg) { console.error(`create-xurface-sdk: ${msg}`); process.exit(1); }

if (!name) die("usage: create-xurface-sdk <dir> --kind skills|tools|capabilities --lang ts|py --spec ./xurface-solution.json");
if (!["skills", "tools", "capabilities"].includes(kind)) die(`unknown --kind ${kind}`);
if (!["ts", "py"].includes(lang)) die(`unknown --lang ${lang}`);
if (existsSync(name) && !force) die(`${name} already exists (use --force to write into it)`);

let spec = null;
if (specPath) {
  try { spec = JSON.parse(readFileSync(specPath, "utf8")); }
  catch (e) { die(`cannot read manifest at ${specPath}: ${e.message}`); }
}
const slug = spec?.solution?.slug ?? name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
const solName = spec?.solution?.name ?? name;
const agentId = `${slug}-agent`.slice(0, 40);

const w = (rel, content) => {
  const p = join(name, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
  console.log(`  + ${rel}`);
};

console.log(`Scaffolding ${kind}-based Xurface SDK (${lang}) in ${name}/`);
mkdirSync(name, { recursive: true });

// ---------------------------------------------------------------- xurface.yaml
w("xurface.yaml", `# Your Solution's agents and abilities. This is your declaration of record:
# what your agents can do on behalf of the user, and how much each action matters.
# Horizon reports back the effective severity levels when the agent declares.
solution: ${slug}
agents:
  - id: ${agentId}
    display_name: ${solName} Agent
    logo: https://example.com/${agentId}.png
    description: Acts for the user inside ${solName}.
    abilities:
      - key: example.read
        kind: ${kind === "skills" ? "skill" : kind === "tools" ? "tool" : "capability"}
        criticity: LOW
        description: A routine action. Passes, logged.
      - key: example.commit
        kind: ${kind === "skills" ? "skill" : kind === "tools" ? "tool" : "capability"}
        criticity: HIGH
        description: A consequential action. Waits for the human.
`);

// ---------------------------------------------------------------- .gitignore
w(".gitignore", `node_modules/
dist/
__pycache__/
# The Solution Manifest is a live credential. Never commit it.
xurface-solution.json
.env
`);

// ---------------------------------------------------------------- entry point
if (lang === "ts") {
  w("package.json", JSON.stringify({
    name: `${slug}-xurface-sdk`,
    version: "0.0.1",
    type: "module",
    private: true,
    scripts: { start: "node --experimental-strip-types src/index.ts" },
    dependencies: { "@xurface/sdk": "github:500xlaunch-org/xurface" },
  }, null, 2) + "\n");
  w("src/index.ts", `import { Xurface } from "@xurface/sdk";

// 1. credentials from the downloaded manifest (or XURFACE_SOLUTION_SPEC)
const xf = Xurface.fromSpec("./xurface-solution.json");

// 2. declare the agent: identity + what it can do on behalf of the user
await xf.declareAgent("${agentId}", {
  displayName: "${solName} Agent",
  description: "Acts for the user inside ${solName}.",
  abilities: [
    { key: "example.read",   kind: "${kind === "skills" ? "skill" : kind === "tools" ? "tool" : "capability"}", criticity: "LOW" },
    { key: "example.commit", kind: "${kind === "skills" ? "skill" : kind === "tools" ? "tool" : "capability"}", criticity: "HIGH" },
  ],
});

// 3. self-discovery: the id your product already has for this user
const found = await xf.discoverUser({ type: "email", value: process.env.USER_EMAIL ?? "ada@example.com" });
if (found.status === "none") throw new Error("user not on Xurface yet");

// 4. guard the consequential ability
const ok = await xf.guard({
  user: found.user!,
  agent: "${agentId}",
  capability: "example.commit",
  details: { what: "the thing about to happen" },
});
console.log("decision:", ok.state);
`);
} else {
  w("main.py", `from xurface import Xurface, XurfaceDenied

# 1. credentials from the downloaded manifest (or XURFACE_SOLUTION_SPEC)
xf = Xurface.from_spec("./xurface-solution.json")

# 2. declare the agent: identity + what it can do on behalf of the user
xf.declare_agent("${agentId}",
                 display_name="${solName} Agent",
                 description="Acts for the user inside ${solName}.",
                 abilities=[
                     {"key": "example.read", "kind": "tool", "criticity": "LOW"},
                     {"key": "example.commit", "kind": "tool", "criticity": "HIGH"},
                 ])

# 3. self-discovery
found = xf.discover_user("email", "ada@example.com")
if found["status"] == "none":
    raise SystemExit("user not on Xurface yet")

# 4. guard the consequential ability
try:
    ok = xf.guard(user=found["user"], agent="${agentId}",
                  capability="example.commit", details={"what": "the thing"})
    print("decision:", ok["state"])
except XurfaceDenied:
    print("the user said no")
`);
  w("requirements.txt", "xurface @ git+https://github.com/500xlaunch-org/xurface#subdirectory=packages/sdk-python\n");
}

// ---------------------------------------------------------------- skills kind
if (kind === "skills") {
  w("skills/SKILL.md", `---
name: ${slug}-discernment
description: How to request the user's discernment before consequential actions in ${solName}. Use before any HIGH or SEVERE action.
---

# Discernment for ${solName}

Before any consequential action (send, publish, pay, delete, credential use), do
not act. Request the user's discernment through Xurface:

1. Ensure the agent is declared (run the SDK's declare step once at start).
2. Call \`guard\` with the user's pairwise id, this agent's id, the capability
   key and the human-readable details of what is about to happen.
3. If the state is \`allowed\` or \`approved\`, proceed. If \`denied\`, stop the
   whole sequence and tell the user's session what was denied. Never retry a
   denied action.
4. Batch related consequential steps into one sequence instead of many separate
   asks. The user can Approve one step, Approve all, or Deny (always all).
`);
}

// ---------------------------------------------------------------- README
w("README.md", `# ${solName} Xurface SDK (${kind}-based)

Generated by create-xurface-sdk. Wire-up order:

1. Download your Solution Manifest from the Horizon console and place it at
   \`./xurface-solution.json\` (never commit it).
2. Edit \`xurface.yaml\`: your agents, their abilities, honest criticities.
3. ${lang === "ts" ? "`npm install && npm start`" : "`pip install -r requirements.txt && python main.py`"}
4. Submit it: https://github.com/500xlaunch-org/xurface/blob/main/toolkit/SUBMITTING.md

The user does nothing but log in to Xurface. Their default email and phone are
used for self-discovery automatically; they can add your Solution by hand with
any other id they use in it.
`);

if (specPath) {
  try { copyFileSync(specPath, join(name, "xurface-solution.json")); console.log("  + xurface-solution.json (copied, gitignored)"); }
  catch { /* leave to the developer */ }
}

console.log(`\nDone. Next: cd ${name} && ${lang === "ts" ? "npm install" : "pip install -r requirements.txt"}`);
