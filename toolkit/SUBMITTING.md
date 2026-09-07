# Submitting an SDK

Submission puts your SDK in the public registry so users can find your Solution
in Xurface Discern and other developers can learn from your integration.

## Checklist before you submit

- [ ] Built with the toolkit or equivalent: manifest-driven, declares its agents,
      guards every consequential ability.
- [ ] Criticity levels are honest. Underrating criticity to skip discernment is
      grounds for suspension of the Solution.
- [ ] No secrets in the package. The Solution Manifest ships to your servers,
      never inside a published SDK.
- [ ] Respects rate limits and discernment budgets (the stock SDKs do this for
      you).
- [ ] A README a stranger could follow.

## How

1. Publish your package where your users are (npm, PyPI, or a public repo).
2. Add one entry to [`registry/index.json`](../registry/index.json):

```json
{
  "slug": "jobhunt-assistant",
  "name": "JobHunt Assistant SDK",
  "kind": "tools",
  "lang": "ts",
  "package": "npm:@acme/jobhunt-xurface",
  "repo": "https://github.com/acme/jobhunt-xurface",
  "publisher": "Acme Labs",
  "solution_uid": "sol_01HXZ4Q8R2"
}
```

3. Open a pull request. Review checks the checklist above, not your code style.
4. On merge, the entry is listed and your Solution becomes searchable from
   Xurface Discern's "add a solution" screen.

Removal or suspension: entries that misdeclare criticity, leak secrets, or abuse
budgets are removed, and the Solution may be suspended platform-side.
