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
The `diversifi` worker has two triggers, which mirror what the old Cloudflare Pages project did: a production deploy on every push to `main`, and a preview deploy with its own URL for every other branch, reported on the pull request as the "Workers Builds: diversifi" check.

| Trigger | Branches | Build command | Deploy command |
|---|---|---|---|
| Deploy default branch | `main` | `npm run build` | `npx wrangler deploy` |
| Deploy non-production branches | all other branches | `npm run build` | `npx wrangler versions upload` |

`wrangler versions upload` uploads a preview version of the worker without promoting it to production.
Preview URLs on workers.dev are on, so each of those versions gets its own address.
The first build from `main` succeeded, and the worker is live at https://diversifi.bravo-labs-admin.workers.dev.
That address is not indexed by search engines, because it is not the production host.

## Settings to set in your Cloudflare account

Set these under Workers & Pages → (worker) → Settings → Variables and Secrets.

The old Pages project `diversifi-landing` had no secrets or bindings to carry over.
Its `VITE_*` variables were unused leftovers.

| Name | Type | Needed? | What it does |
|---|---|---|---|
| `RPC_URL` | **Secret** | Optional | A private Ethereum mainnet RPC URL (Alchemy, Infura or similar). Used on the server for the reserve figures. Never sent to browsers. It needs a key with **no** allowed-origins limit, because the Worker's requests carry no `Origin` header. Without it, the site falls back to public RPCs, which work but are slower and sometimes fail. |
| `NEXT_PUBLIC_RPC_URL` | Build variable | Optional | An RPC the **browser** uses to refresh the reserve figures every minute (the Worker also tries it after `RPC_URL`). If you set one, use a key restricted to your domain: it is visible to visitors. The plan is the existing Alchemy key with https://diversifi.tech in its allowed origins, set on both Workers Builds triggers. Without it, browsers use a public RPC. |
| `NEXT_PUBLIC_SITE_URL` | Build variable | Optional | The canonical address. Defaults to `https://diversifi.tech`. Every other host, such as `*.workers.dev` previews, automatically gets a "noindex" header. |

Build variables are read by `npm run build`, which bakes them into both the pages and the Worker, so a change needs a new build.

## Cloudflare resources

Defined in `wrangler.jsonc`:

- **Worker name:** `diversifi`. If you rename it, change `name` to the same new name.
- **Static assets:** the `out/` folder that `npm run build` writes, bound to the Worker as `ASSETS`. Nothing to create in the dashboard.
- **Custom domains:** `diversifi.tech` and `www.diversifi.tech` get attached to the worker at cutover (see "Cutover and rollback").

## Cutover and rollback

The cutover moves both hostnames off the old Pages project `diversifi-landing` and onto the `diversifi` worker as custom domains, then turns on the `www_to_apex` redirect rule, which is already in the zone but disabled.
It was rehearsed on 2026-11-22 on a throwaway host and caused no failed requests.
For a problem in the new site's code, the rollback is to the worker's previous version, which is instant and keeps the domain.
Moving the domain back to the old site works too, but costs about a minute of errors, so it is a last resort.
Detail: the "Cutover runbook", "Rollback" and "Go-live checks" sections of [docs/reference/serving.md](docs/reference/serving.md).

Plain version: switching the domain to the new site is a short list of steps that has been practiced and caused no downtime.
If the new site has a bug, putting back the last good version of the worker is instant; going back to the old site is possible but leaves the site down for about a minute.

## Go-live checklist

- [x] First deploy succeeds (the first Workers Builds build from `main`, 2026-11-22)
- [ ] RPC setup.
  Stephen is adding https://diversifi.tech to the existing Alchemy key's allowed origins, so it can be the browser's `NEXT_PUBLIC_RPC_URL`, a build variable on both triggers.
  A server `RPC_URL` is optional and needs a key with no origin limit (see "Settings to set in your Cloudflare account"); the public RPCs work without it.
- [x] Workers Builds connected with both triggers, "Deploy default branch" and "Deploy non-production branches" (see Stack), and preview URLs on workers.dev turned on (2026-11-22).
  A push to a branch other than `main` produces a preview URL on its pull request.
- [x] Cutover rehearsed on 2026-11-22 on rehearsal.diversifi.tech, with zero failed requests; every go-live check passed there (see "Cutover and rollback")
- [ ] At cutover, diversifi.tech and www.diversifi.tech removed from the old Pages project `diversifi-landing` first, then added as custom domains on the worker, following the "Cutover runbook" in [docs/reference/serving.md](docs/reference/serving.md)
- [ ] diversifi.tech points at the worker, and every one of the "Go-live checks" in [docs/reference/serving.md](docs/reference/serving.md) passes on the real domain, including that it does **not** send `X-Robots-Tag`
- [ ] www.diversifi.tech redirects to diversifi.tech with a single redirect rule.
  The old site served identical content on both, which splits search ranking.
  Prepared on 2026-11-22: the rule `www_to_apex` (a 301 to https://diversifi.tech with the same path and query string) exists, disabled, and gets enabled at cutover.
- [ ] Old URLs keep working.
  The old site used trailing slashes (`/terms/`), which the new site 308-redirects to `/terms`; it passed on the rehearsal host, so check it once on the real domain.
- [ ] Cloudflare Web Analytics still records visits after cutover.
  The zone auto-installs the beacon, and the content security policy allows it.
- [x] Terms reviewed: the company name ("Diversifi Stables, Inc."), Bravo Labs and the bravolabs.xyz email addresses are confirmed correct, and the token is now called DFiUSD instead of USDFI.
- [ ] Once the new site is confirmed live, the old Pages project `diversifi-landing` deleted and the old repo `DiversiFi-Protocol/diversifi-landing` archived
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
