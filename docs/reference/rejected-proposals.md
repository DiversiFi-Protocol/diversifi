# Rejected proposals

This file owns the list of designs that were proposed and ruled against, one line each, with a pointer to the decision record that holds the reasoning.
Read it before proposing a design change: re-opening a line here needs new information, not a fresh reading of the same facts.
A ruling that is later overturned is marked REVERSED, not deleted.
Plain version: these are ideas that were already looked at and turned down, with a link to why.

- **Email sign-up for a monthly reserve reading** (and the old Substack sign-up it replaced): ruled out, nobody will send the email. See [2026-11-21-no-email-sign-up.md](../decisions/2026-11-21-no-email-sign-up.md), "No email sign-up on the site".
- **Fork and strip `@opennextjs/cloudflare`:** ruled out, a permanent rebase-and-audit job for an adapter that patches Next.js internals; the site dropped OpenNext instead. See [2026-11-21-drop-opennext.md](../decisions/2026-11-21-drop-opennext.md), "Drop OpenNext: a static export behind a hand-written Worker".
- **Keep `@opennextjs/cloudflare` unforked (hold off):** Stephen's first choice on 2026-11-21, replaced the same day by dropping it. See [2026-11-21-drop-opennext.md](../decisions/2026-11-21-drop-opennext.md).
- **Render the reserve figures only in the browser:** ruled out, crawlers and AI tools that do not run JavaScript would lose the live figures. See [2026-11-21-live-figures-in-static-pages.md](../decisions/2026-11-21-live-figures-in-static-pages.md), "Live figures in static pages: a template the Worker fills in".
- **Rewrite figures inside React's payload, or only in the visible HTML:** ruled out, the first corrupts length-prefixed payload rows and the second causes hydration errors. See [2026-11-21-live-figures-in-static-pages.md](../decisions/2026-11-21-live-figures-in-static-pages.md).
- **Rebuild and redeploy the site every minute:** ruled out, a deploy per minute and a single point of failure for freshness. See [2026-11-21-live-figures-in-static-pages.md](../decisions/2026-11-21-live-figures-in-static-pages.md).
