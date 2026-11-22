# Reference index

Detail files for the site, one per topic.
Design decisions and their reasoning are in [docs/decisions/](../decisions/), one record per decision, named by date.
The overall picture of the site is in [HANDOVER.md](../../HANDOVER.md); open a file here only for the topic you are working on.

| File | Scope | Covers | Status | Anchor in HANDOVER.md | Decision records |
|---|---|---|---|---|---|
| [dependencies.md](dependencies.md) | Exact pins, audits, overrides and fork decisions for every third-party package | `package.json` (`dependencies`, `devDependencies`, `overrides`), `package-lock.json`, `.npmrc`, `next`, `react`, `viem`, `@opennextjs/cloudflare`, `wrangler`, `glob`, `minimatch`, `zod` | Current as of 2026-11-21 | Stack | [2026-11-21-hold-off-forking-opennextjs-cloudflare.md](../decisions/2026-11-21-hold-off-forking-opennextjs-cloudflare.md) |
| [rejected-proposals.md](rejected-proposals.md) | Designs proposed and ruled against, one line each | email sign-up, `/api/subscribe`, `SUBSCRIBE_WEBHOOK_URL`, Substack, forking `@opennextjs/cloudflare` | Current as of 2026-11-21 | Stack, and the opening section | [2026-11-21-no-email-sign-up.md](../decisions/2026-11-21-no-email-sign-up.md), [2026-11-21-hold-off-forking-opennextjs-cloudflare.md](../decisions/2026-11-21-hold-off-forking-opennextjs-cloudflare.md) |
