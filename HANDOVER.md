# diversifi.tech: handover

The marketing site for DFiUSD: home page, `/faq`, `/terms`, the whitepaper and audit PDFs, and the search and AI files. It has **no wallet connection, no transaction code and no email sign-up**. Every "open app" and "get DFiUSD" button links to the app at **https://app.diversifi.tech**, which runs from the `v1-interface` repo.

The site only *reads* public data: the live reserve figures come from the ReserveManagerV1 contract (`0x8978F3A0227453Dd0821bC8A85e4bEF96DAF8327`) through an Ethereum RPC.

## Stack

- Next.js 16 (App Router) + TypeScript, built as a **static export** (plain files in `out/`)
- A small hand-written **Cloudflare Worker** (`worker/`) in front of those files, served through Workers Static Assets: it fills the live reserve figures into the pages (read at most once a minute), builds `robots.txt` and `llms.txt`, and adds the security headers.
  It uses only Cloudflare's built-in APIs and the site's own `lib/` code; `wrangler` is the only build and deploy tool.
  OpenNext was removed on 2026-11-21, and with it the need for R2.
  Decided in: [docs/decisions/2026-11-21-drop-opennext.md](docs/decisions/2026-11-21-drop-opennext.md).
  Detail: [docs/reference/serving.md](docs/reference/serving.md).
- `viem` for the read-only contract calls
- Every dependency is pinned to an exact version.
  The audit of each one, the `overrides` that fix security alerts in transitive packages, and the fork decisions are in [docs/reference/dependencies.md](docs/reference/dependencies.md).

| Task | Command |
|---|---|
| Local development | `npm install`, then `npm run dev` (http://localhost:3000; the pages only, without the Worker) |
| Local preview, as deployed | `npm run preview` (builds, then serves with `wrangler dev` on http://localhost:8787) |
| Production build | `npm run build` |
| Deploy | `npm run deploy` (builds, then `wrangler deploy`) |
| Type check | `npm run typecheck` |

**Cloudflare Workers Builds** is connected to this repo (since 2026-11-22), on the Bravo Labs Admin Cloudflare account (`8a77f361840c0e6dda6cae6a3002514c`).
The `diversifi` worker has two triggers, which mirror what the old Cloudflare Pages project did: a production deploy for `main`, and a preview deploy with its own URL for every other branch, reported on the pull request as the "Workers Builds: diversifi" check.

| Trigger | Branches | Build command | Deploy command |
|---|---|---|---|
| Deploy default branch | `main` | `npm run build` | `npx wrangler deploy` |
| Deploy non-production branches | all other branches | `npm run build` | `npx wrangler versions upload` |

`wrangler versions upload` uploads a preview version of the worker without promoting it to production.
Preview URLs on workers.dev are on, so each of those versions gets its own address.

Pushes to this repo currently start no builds.
The Cloudflare GitHub app does not seem to receive push events for the repo since it was renamed from `diversifi` to `diversifi-landing`.
Until that is fixed, a build runs only when someone starts it by hand on its trigger, in the Cloudflare dashboard or through the API; merging to `main` deploys nothing by itself.
Plain version: Cloudflare is supposed to rebuild the site whenever code is pushed, but right now it does not notice the pushes, so every build has to be started by hand.

The worker serves https://diversifi.tech and https://www.diversifi.tech since the cutover on 2026-11-23 (see "Cutover and rollback").
It also answers at https://diversifi.bravo-labs-admin.workers.dev, which is not indexed by search engines, because it is not the production host.

## Settings to set in your Cloudflare account

Set these under Workers & Pages → (worker) → Settings → Variables and Secrets.

The old Pages project `diversifi-landing` had no secrets or bindings to carry over.
Its `VITE_*` variables were unused leftovers.

| Name | Type | Needed? | What it does |
|---|---|---|---|
| `RPC_URL` | **Secret** | Optional | A private Ethereum mainnet RPC URL (Alchemy, Infura or similar). Used on the server for the reserve figures. Never sent to browsers. It needs a key with **no** allowed-origins limit, because the Worker's requests carry no `Origin` header. Without it, the site falls back to public RPCs, which work but are slower and sometimes fail. |
| `NEXT_PUBLIC_RPC_URL` | Build variable | Optional | An RPC the **browser** uses to refresh the reserve figures every minute. If you set one, use a key restricted to your domain: it is visible to visitors. The Worker also tries it after `RPC_URL`, but an origin-restricted key rejects those requests because they carry no `Origin` header, so without a server `RPC_URL` each reserve read (at most once a minute per location) spends one rejected call before falling through to the public RPCs; the site still works. It is set on both Workers Builds triggers to the key of the dedicated "DiversiFi Landing Site" Alchemy app, whose allowed origins are diversifi.tech and www.diversifi.tech, and the production version carries it. Without it, browsers use a public RPC. |
| `NEXT_PUBLIC_SITE_URL` | Build variable | Optional | The canonical address. Defaults to `https://diversifi.tech`. Every other host, such as `*.workers.dev` previews, automatically gets a "noindex" header. |

Build variables are read by `npm run build`, which bakes them into both the pages and the Worker, so a change needs a new build.

## Cloudflare resources

Defined in `wrangler.jsonc`:

- **Worker name:** `diversifi`. If you rename it, change `name` to the same new name.
- **Static assets:** the `out/` folder that `npm run build` writes, bound to the Worker as `ASSETS`. Nothing to create in the dashboard.

Set in the Cloudflare account, not in `wrangler.jsonc`:

- **Custom domains:** `diversifi.tech` and `www.diversifi.tech`, attached to the worker at the cutover on 2026-11-23 (see "Cutover and rollback").

## Cutover and rollback

The cutover ran on 2026-11-23: both hostnames moved off the old Pages project `diversifi-landing` and onto the `diversifi` worker as custom domains, and the `www_to_apex` redirect rule was turned on.
It had been rehearsed on 2026-11-22 on a throwaway host, with no failed requests, and every go-live check passed on the real domain afterwards.
For a problem in the new site's code, the rollback is to the worker's previous version, which is instant and keeps the domain.
Moving the domain back to the old site works too, as long as the old Pages project still exists, but costs about a minute of errors, so it is a last resort.
Detail: the "Cutover runbook", "Rollback" and "Go-live checks" sections of [docs/reference/serving.md](docs/reference/serving.md).

Plain version: diversifi.tech now shows the new site.
The switch followed a short list of steps that had been practiced first, and all the checks passed afterwards.
If the new site has a bug, putting back the last good version of the worker is instant; going back to the old site is possible while the old site is kept, but leaves the site down for about a minute.

## Go-live checklist

- [x] First deploy succeeds (the first Workers Builds build from `main`, 2026-11-22)
- [x] RPC setup (2026-11-22, moved to its own Alchemy app on 2026-11-23).
  The key of the dedicated "DiversiFi Landing Site" Alchemy app allows https://diversifi.tech and https://www.diversifi.tech as origins and is the browser's `NEXT_PUBLIC_RPC_URL`, a secret build variable on both triggers.
  On workers.dev and preview URLs, which the key does not allow, browsers fall back to the public RPCs.
  A server `RPC_URL` is optional and needs a key with no origin limit (see "Settings to set in your Cloudflare account"); the public RPCs work without it.
- [x] Workers Builds connected with both triggers, "Deploy default branch" and "Deploy non-production branches" (see Stack), and preview URLs on workers.dev turned on (2026-11-22).
  Pushes currently start no builds, so each build is started by hand (see Stack).
- [x] Cutover rehearsed on 2026-11-22 on rehearsal.diversifi.tech, with zero failed requests; every go-live check except the www redirect passed there (see "Cutover and rollback")
- [x] At cutover, diversifi.tech and www.diversifi.tech removed from the old Pages project `diversifi-landing` first, then added as custom domains on the worker, following the "Cutover runbook" in [docs/reference/serving.md](docs/reference/serving.md) (2026-11-23)
- [x] diversifi.tech points at the worker, and every one of the "Go-live checks" in [docs/reference/serving.md](docs/reference/serving.md) passes on the real domain, including that it does **not** send `X-Robots-Tag` (2026-11-23)
- [x] www.diversifi.tech redirects to diversifi.tech with a single redirect rule (2026-11-23).
  The old site served identical content on both, which splits search ranking.
  The rule `www_to_apex` (a 301 to https://diversifi.tech with the same path and query string) was prepared disabled on 2026-11-22 and enabled at cutover.
- [x] Old URLs keep working (2026-11-23).
  The old site used trailing slashes (`/terms/`), which the new site 308-redirects to `/terms`; this passed on the real domain as one of the go-live checks.
- [ ] Cloudflare Web Analytics still records visits after cutover.
  The zone auto-installs the beacon, and the content security policy allows it.
- [x] Terms reviewed: the company name ("Diversifi Stables, Inc."), Bravo Labs and the bravolabs.xyz email addresses are confirmed correct, and the token is now called DFiUSD instead of USDFI.
- [ ] Once the new site is confirmed live, the old Pages project `diversifi-landing` deleted and the old repo `DiversiFi-Protocol/diversifi-landing-old` archived.
  Until then, both are kept as the rollback path (see "Cutover and rollback").
  On 2026-11-22 the old repo was renamed from `diversifi-landing` to `diversifi-landing-old`, and this repo from `diversifi` to `diversifi-landing`; the Pages project and the worker kept their names
- [x] Zone hardened on 2026-11-22:
  - Always Use HTTPS is on, minimum TLS is 1.2, and SSL mode is Full (strict).
  - CAA records allow letsencrypt.org, pki.goog, ssl.com and sectigo.com, for both `issue` and `issuewild`.
    Cloudflare also adds comodoca.com and digicert.com on its own.
  - DNSSEC is enabled.
    The domain is registered with Cloudflare Registrar, which publishes the DS record by itself, so nothing needs pasting at a registrar.
    It showed "pending" on 2026-11-22.
  - Domain auto-renew is on.
    The registration runs to 2027-05-01, and the domain is transfer-locked.
- [ ] Google Search Console and Bing Webmaster Tools verified; sitemap submitted
- [ ] Re-run https://isitagentready.com and PageSpeed Insights on the real domain
- [ ] Ask the previous developer, GitHub user DLTA9, to delete the `diversifi` worker in their own Cloudflare account.
  Their old builds came from it.

Left out on purpose: the old site's Discord invite, Merkl rewards link, Calendly "schedule a demo" link and Substack sign-up were dropped in the rebrand intentionally.
The hello@ email replaces the Calendly link, and there is no email sign-up (decided in [docs/decisions/2026-11-21-no-email-sign-up.md](docs/decisions/2026-11-21-no-email-sign-up.md)).

## Safety built in

- Security headers on every page (`worker/headers.ts`): a content security policy that only allows the site's own scripts, the listed Ethereum RPCs and Cloudflare Web Analytics, no framing, HSTS, nosniff, and a strict referrer policy
- Preview hosts are kept out of search engines automatically
- No secrets in the repository; `.env.production` holds public settings only

## History

This repo used to contain an app page at `/app`. That page and its wallet and transaction code were removed before handover. The app design now lives in `v1-interface`.
