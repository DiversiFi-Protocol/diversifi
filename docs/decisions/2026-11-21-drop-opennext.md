# Drop OpenNext: a static export behind a hand-written Worker

- **Status:** decided.
- **Decided by:** Stephen, on 2026-11-21.

## Question

`@opennextjs/cloudflare` scored high on all three fork criteria of the `dependency-management` rules, so the rules call for forking and stripping it.
Should the site fork it, keep it as it is, or stop using it?

## Context

The site ran Next.js on Cloudflare Workers through OpenNext, which turns a Next.js server build into a Worker and needs an R2 bucket (and a self-referencing service binding) for its page cache.
The only thing the site needs a server for is to keep the live reserve figures in the HTML fresh for crawlers and AI tools (incremental static regeneration every 60 seconds on `/` and `/faq`, hourly for `llms.txt`), plus the security headers and the per-host `robots.txt`.
The same day, Stephen first chose to hold off on the fork; he then decided to drop OpenNext instead, before that hold was ever recorded.

## Decision

Remove OpenNext.
Next.js builds the site into plain files (`output: 'export'`), Cloudflare serves them through Workers Static Assets, and a small hand-written Worker in front of them does the server's one job, using only Cloudflare's built-in APIs (HTMLRewriter, the Cache API, `fetch`) and the repository's own `lib/` code, so the reserve-reading logic stays in one place.
`wrangler` is the only build and deploy tool; `open-next.config.ts`, the R2 binding and the `WORKER_SELF_REFERENCE` service are gone.
The requirement was that the site works exactly as before, proven by a before-and-after comparison.

## Reasoning

- **All three fork criteria scored high.**
  OpenNext's tree was 386 packages, 271 of them installed only because of it, including the AWS SDK clients that `@opennextjs/aws` pulls in although the site never runs on AWS.
  The scores and evidence are in [dependencies.md](../reference/dependencies.md), section "Removed: @opennextjs/cloudflare".
- **A fork would be a permanent rebase-and-audit job.**
  OpenNext patches Next.js internals, so every Next.js release would mean rebasing the fork, re-checking its patches and re-auditing it.
- **The site needs a server for one small job.**
  Filling the live figures into otherwise static pages, a few headers and two text files do not justify a framework adapter.
- **Dropping it also removes R2.**
  R2 is not enabled on the Cloudflare account, and the page cache bucket was the only reason to enable it.

## Alternatives considered

- **Fork and strip `@opennextjs/cloudflare`.**
  Ruled out: the permanent rebase-and-audit cost above, for code that does far more than the site needs.
- **Keep OpenNext unforked (hold off).**
  Stephen's first choice that day, replaced by this decision: it leaves the 271-package tree and R2 in place.
- **Render the figures only in the browser.**
  Ruled out: crawlers and AI tools that do not run JavaScript would no longer see live figures, which the site promised them before.

## Consequences

- The dependency tree shrinks from 342 installed packages to 77 (both counted by `npm audit signatures`, see dependencies.md).
- The Worker owns everything the server did: how it fills in the figures without upsetting React's hydration is the design in [2026-11-21-live-figures-in-static-pages.md](2026-11-21-live-figures-in-static-pages.md), and its behavior is described in [serving.md](../reference/serving.md).
- R2 no longer needs to be enabled for the site, and the Cloudflare build pipeline can be connected without it.
- Adding a page that shows live figures means routing its figures through the shared views in `lib/reserve-view.ts`; a page without figures needs nothing.

## Plain version

The site used a big add-on, OpenNext, to run Next.js on Cloudflare.
It brought in hundreds of other packages, most of them for things the site never uses, and copying and trimming it would have meant redoing that work every time Next.js changed.
The site only needs a server to put fresh reserve numbers into its pages, so Stephen decided to remove the add-on.
Now Next.js makes plain files, and a small piece of our own code puts the fresh numbers in when someone loads a page.
This also means the site no longer needs Cloudflare's R2 storage.
