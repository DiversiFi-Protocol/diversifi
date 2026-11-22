# Serving: the static export and the Worker in front of it

This file owns how the site is built and served: the static export, what the Worker (`worker/`) does with each request, how the live reserve figures get into the pages, the edge cache, the response headers, the build-time settings the Worker needs, and the operational steps that move the production domain onto the Worker: the cutover runbook, the rollback and the go-live checks.
Plain version: this explains what happens between someone opening a page and the page arriving, how the fresh reserve numbers get into it, and the exact steps for switching diversifi.tech from the old site to this one, and back if needed.

Decided in: [2026-11-21-drop-opennext.md](../decisions/2026-11-21-drop-opennext.md) and [2026-11-21-live-figures-in-static-pages.md](../decisions/2026-11-21-live-figures-in-static-pages.md).

## Build

`npm run build` runs `next build` with `output: 'export'` (`next.config.ts`), which writes the whole site as files to `out/`: one `.html` file per page (`index.html`, `faq.html`, `terms.html`, `404.html`), the client-navigation payloads (`*.txt`), `sitemap.xml`, the files from `public/` and the `_next/static/` assets.
It then runs `scripts/write-worker-build-env.mjs` (see "Build-time settings").
`wrangler` bundles `worker/index.ts` and uploads it together with `out/` as Workers Static Assets (`wrangler.jsonc`).
No page reads the chain during the build; the pages hold a template instead (see "Live figures").

Plain version: the build makes plain files, plus one small program that runs in front of them.

## Requests

The Worker runs first for every request (`run_worker_first`), with the assets' own HTML and 404 handling turned off, and fetches the files itself through the `ASSETS` binding:

| Request | Response |
|---|---|
| Any path ending in `/` except `/` | 308 to the same path without the trailing slash, query kept (`/terms/` → `/terms`) |
| `/robots.txt` | Built per request from the `Host` header by `lib/robots.ts`: preview hosts get `Disallow: /` |
| `/llms.txt` | Built by `lib/llms.ts` from the cached reading, rebuilt at most hourly; without a reading it carries the static facts and no reserve table |
| A path without a dot (`/`, `/faq`, `/terms`) | That page's `.html` file, with the live figures filled in when it has any |
| `*.txt` client-navigation payloads | The file, with the live reading filled in when it has one |
| Any `*.html` path, `/404`, `/_not-found`, or a missing file | `404.html` with status 404 |
| Everything else | The file from `out/` as Workers Static Assets serves it |

A `HEAD` request for a file or page is answered as the matching `GET` (same status and headers, including the filled page's cache headers) with no body.

## Live figures

Every page output that depends on the reserve reading comes from the pure view functions in `lib/reserve-view.ts` (`panelView`, `rollView`, `barView`, `sectionView`, `faqView`), which the components render and the Worker also calls.

- The static build renders each view string as a token `@@r:<key>@@` (or `@@raw:<key>@@` for the FAQ's JSON-LD, which goes into a script element unescaped), and renders the elements of both first-render states, tagged `data-rm="live"` or `data-rm="unavailable"`.
- Each page passes its reading to the client components as the seed prop, which the build sets to `SEED_PLACEHOLDER` (`lib/reserve-seed.ts`).
- For a page or payload containing the placeholder, the Worker replaces it with the encoded reading (base64url of a compact JSON array, about 0.5 KB), replaces every token with `initialViewValues(seed)[key]` escaped the way React escapes text (`& < > " '`), and drops the elements tagged with the other state using HTMLRewriter.
- In the browser, `ReserveProvider` and the FAQ components decode the seed and render the same views from it, so their first render matches the HTML; the home page then re-reads the chain itself on mount, every 60 seconds and when the window regains focus, as before.
- The JavaScript bundle also contains the placeholder (as the constant that `decodeSeed` compares against), so the Worker only fills in `.html` and `.txt` responses.
- A token without a value is replaced by an empty string and logged (`reserve template tokens without a value`), which would also show up as a hydration error in the browser.

Limits:

- The rolling block number's cells are fixed to the 8-digit format (`dd,ddd,ddd`, `ROLL_DIGIT` in `components/home.tsx`), which holds until block 99,999,999.
- The template matches the hero bar's props only (`HERO_BAR` in `lib/reserve-view.ts`); a second `ReserveBar` with other props would need its own view keys.
- A new figure on a page needs a view entry, and a new element that exists in only one state needs a `data-rm` tag.

Plain version: the pages are built with blanks where the numbers go, the Worker fills the blanks with the latest reading, and the page in the browser works out the same numbers from the same reading, so nothing has to be corrected when it starts.

## Edge cache

`cached()` in `worker/index.ts` keeps two values, each in the isolate's memory and in the Cache API (cache `diversifi-worker`), with concurrent misses sharing one rebuild:

| Value | Lifetime | Cost per lifetime and location |
|---|---|---|
| The reserve reading (`readSeed()`: the reading, or `FALLBACK_READING` marked not live when every RPC fails) | 60 seconds | One reserve read: a block request and one multicall batch |
| The `llms.txt` body | 3600 seconds | One build from the cached reading |

A failed read is cached for the same 60 seconds, so a failing RPC is retried once a minute rather than on every request.
The Cache API does nothing on `*.workers.dev`, so preview deploys there cache per isolate only.
Measured locally on 2026-11-21 with `wrangler dev`: 2,280 page requests over 125 seconds caused two reserve reads (four RPC requests).

## RPC settings

The Worker reads the chain through `lib/reserve.ts`, unchanged: the server's RPC list is `RPC_URL` (a Worker secret, read from `process.env` through `nodejs_compat`), then `NEXT_PUBLIC_RPC_URL`, then the public RPCs (publicnode, dRPC, llamarpc), each with a 4-second timeout and one retry.
The browser uses `NEXT_PUBLIC_RPC_URL`, publicnode and dRPC, inlined into the client bundle by Next.js at build time.

## Build-time settings

Next.js inlines `NEXT_PUBLIC_*` settings at build time into everything it builds; `wrangler` does not.
`scripts/write-worker-build-env.mjs` loads `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_RPC_URL` with Next.js's own loader (`@next/env`: the process environment, then the `.env*` files) and writes them to `worker/build-env.generated.ts` (git-ignored), and `worker/build-env.ts`, imported first by the Worker, applies them to `process.env` before `lib/site.ts` and `lib/reserve.ts` read them.
So the Worker always sees the values the pages were built with, and a runtime variable of the same name is overridden, as it was in the code Next.js built before.

## Headers

`worker/headers.ts` adds, to every page-like path (not under `/_next/` or `/api/`, and not ending in `.png`, `.svg`, `.ico`, `.woff2`, `.txt`, `.xml` or `.pdf`, the old middleware's matcher):

- the content security policy (own scripts, Cloudflare Web Analytics, the listed RPCs; `upgrade-insecure-requests`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin` and HSTS (two years, subdomains);
- `Link` headers to the sitemap and `llms.txt`;
- `X-Robots-Tag: noindex, nofollow` unless `X-Forwarded-Host`, or else `Host`, is the canonical host or its `www.` form (`isProdHost` in `lib/site.ts`).

Cache headers, matching what OpenNext sent:

| Response | `Cache-Control` |
|---|---|
| `/` and `/faq` (and their payloads) | `s-maxage=<seconds left on the cached reading>, stale-while-revalidate=2592000` |
| `/terms` | `s-maxage=31536000, stale-while-revalidate=2592000` |
| `/llms.txt` | `s-maxage=<seconds left on the cached body>, stale-while-revalidate=2592000` |
| `/robots.txt` | `public, max-age=3600` |
| Any 404 | `private, no-cache, no-store, max-age=0, must-revalidate` |
| Other files | as Workers Static Assets sends them (`public, max-age=0, must-revalidate` with an ETag) |

## Local preview

`npm run preview` builds and serves the site with `wrangler dev`, the real `workerd` runtime, with secrets from `.dev.vars`.
`npm run dev` runs `next dev` for editing: the pages read the chain on the server there (`pageSeed`), but nothing from the Worker runs, so there are no security headers, no `robots.txt` and no `llms.txt`.

## Cutover runbook

Until this runbook is run, diversifi.tech and www.diversifi.tech are served by the old Cloudflare Pages project `diversifi-landing`.
The `diversifi` worker already serves the new site at https://diversifi.bravo-labs-admin.workers.dev, which sends `X-Robots-Tag: noindex, nofollow` because it is not the production host (see "Headers").
Everything below is in the Bravo Labs Admin Cloudflare account (`8a77f361840c0e6dda6cae6a3002514c`), in the diversifi.tech zone.

Prepared beforehand: the zone has a single redirect rule, ref `www_to_apex`, which sends www.diversifi.tech to https://diversifi.tech with the same path, as a 301 that keeps the query string.
It was created disabled and is enabled in step 5.

Steps, in order:

1. Note the two CNAME records `diversifi.tech` and `www.diversifi.tech`, both pointing to `diversifi-landing.pages.dev` and proxied.
   The rollback needs them.
2. Remove both hostnames from the custom domains of the Pages project `diversifi-landing`.
3. Delete the two CNAME records.
   A Worker custom domain creates and owns its own DNS record, so the old records have to be gone before step 4.
4. Attach both hostnames as Worker custom domains of `diversifi`.
5. Enable the `www_to_apex` redirect rule.
6. Run the "Go-live checks" below on the real domain.

Rehearsed on 2026-11-22 on a throwaway host, `rehearsal.diversifi.tech`, set up exactly like production with the old Pages site behind it; the host was removed afterwards.
Measured in the rehearsal:

- the API calls for the steps took about 1.7 s in total;
- a probe sending a request twice a second saw zero failed requests;
- the old site answered until about 1.5 s in, and the new one from about 2.5 s.

Plain version: the switch takes the two addresses away from the old site, deletes the old address records, and gives the addresses to the new site.
In the practice run on a spare address, the steps took under two seconds, the new site answered within three seconds, and no visitor request failed.

## Rollback

There are two ways back, and the first one is preferred.

- **For a problem in the new site's code:** roll the worker back to its previous version, in the Workers dashboard (`diversifi`, Deployments) or with `npx wrangler rollback`.
  That is instant and keeps the domain on the worker.
  Fixing forward with a new push to `main` also works, because Workers Builds deploys it (see "Stack" in [HANDOVER.md](../../HANDOVER.md)).
- **To go back to the old site:**
  1. Detach both hostnames from the worker's custom domains.
  2. Restore the two CNAME records noted in step 1 of the "Cutover runbook" (`diversifi-landing.pages.dev`, proxied).
  3. Re-add both hostnames to the custom domains of the Pages project `diversifi-landing`.

  The rehearsal measured about 60 s of HTTP 522 errors while Pages re-validated the domain.
  So this is a last resort; fixing forward or rolling back the worker version is preferred.

Plain version: if the new site has a bug, switch the worker back to its last good version, which takes effect at once.
Moving the domain back to the old site also works, but the site is down for about a minute while that happens.

## Go-live checks

Repeat these on https://diversifi.tech after the cutover.
All of them passed on rehearsal.diversifi.tech on 2026-11-22, except the last row, which the rehearsal had no www host for.

| Check | Expected |
|---|---|
| `/`, `/faq`, `/terms`, `/docs/whitepaper.pdf`, `/docs/diversifi-audit.pdf` | 200 |
| `/terms/` | 308 to `/terms` |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/og-1200x630.png`, `/favicon.ico` | 200 |
| A path that does not exist, and `/api/subscribe` | 404 |
| `http://diversifi.tech/` | 301 to `https://diversifi.tech/` |
| A TLS 1.1 connection (`curl --tlsv1.1 --tls-max 1.1`) | Refused |
| Security headers on a page (see "Headers") | All present: the content security policy, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Strict-Transport-Security` |
| `X-Robots-Tag` | **Absent** on the real domain. The rehearsal host correctly sent it, because it is not the production host. |
| The page HTML | Contains the Cloudflare Web Analytics beacon, which Cloudflare injects |
| `/` and `/llms.txt` | Show live reserve figures |
| The certificate | Issued by Google Trust Services |
| `https://www.diversifi.tech/faq?x=1` | 301 to `https://diversifi.tech/faq?x=1` (the `www_to_apex` rule) |

## Before-and-after comparison (2026-11-21)

The switch from OpenNext was checked by recording the old site (main at `9945262`, `opennextjs-cloudflare preview`) and the new one (`wrangler dev`) with the same scripts:

- every route (25 paths, including every file in `public/`) and five host variants: status, content type, every header except framework-internal ones, and the page text with figures masked: identical;
- what a crawler and a browser get when every RPC fails (DNS blocked for the server and the browser): identical text and pixel-identical screenshots;
- screenshots at 1440 px and 375 px of `/`, `/faq` and `/terms`: pixel-identical except the figures' values and times;
- the browser console: no errors and no hydration warnings (a deliberately altered figure produced React error 418, confirming the check works);
- the browser's refresh on load, every 60 seconds and on focus, client-side navigation, and the Web Analytics beacon under the CSP: unchanged.

Intended differences: the framework-internal headers (`x-nextjs-*`, `x-opennext-*`, `x-powered-by`, Next.js's `Vary`) are gone; pages with live figures carry no ETag; the client-navigation payloads are static `*.txt` files instead of server-rendered `?_rsc` responses; and the figures are never older than 60 seconds, where OpenNext's stale-while-revalidate served a page up to about 100 seconds old once before regenerating it.
