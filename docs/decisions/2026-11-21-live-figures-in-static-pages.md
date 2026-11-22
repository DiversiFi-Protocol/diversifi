# Live figures in static pages: a template the Worker fills in

- **Status:** decided.
- **Decided by:** the agent that removed OpenNext, on 2026-11-21, within Stephen's requirements for that change (the site works exactly as before; the Worker uses only Cloudflare's built-in APIs plus the repository's `lib/reserve.ts` and viem; React hydrates without warnings).

## Question

With OpenNext gone ([2026-11-21-drop-opennext.md](2026-11-21-drop-opennext.md)), the pages are files built once.
How does the Worker put a reserve reading that is at most a minute old into the home page and the FAQ, so crawlers see it, without React finding HTML it did not render when it hydrates?

## Context

React hydrates a page by rendering it again in the browser and comparing the result with the HTML: any text or element that differs is a hydration error.
The figures appear in about seventy places (rails, the reserve bar, the table, two FAQ answers and the FAQ's JSON-LD), several of them inside style and `aria-label` attributes, and some elements only exist in one state (the "reserve data couldn't load" notices only when the read failed).
The Worker cannot run React or Next.js itself.

## Decision

- Every output that depends on the reading is computed by one set of pure view functions in `lib/reserve-view.ts`, which the components and the Worker both call.
- The static build renders each of those outputs as a token (`@@r:<key>@@`), and renders the elements of both first-render states, each tagged `data-rm="live"` or `data-rm="unavailable"`.
- The page passes its reading to the client components as one opaque string prop, the seed, which the build sets to a placeholder (`lib/reserve-seed.ts`).
- On each request the Worker takes the cached reading, replaces the seed in the HTML and in the client-navigation payloads (`*.txt`), replaces every token with the view's value for that reading (escaped as React escapes), and removes the elements tagged with the other state.
- In the browser the components decode the seed and render the same views from the same reading, so their first render equals the served HTML.

## Reasoning

- **One source for every figure.**
  The Worker does not re-implement any formatting; it calls the functions the components call, so a change to a figure's wording changes both.
- **Hydration matches by construction.**
  The browser's first render and the served HTML come from the same reading through the same functions; the before-and-after comparison found no hydration errors or warnings.
- **The page structure stays fixed.**
  Choosing between the two first-render states by removing tagged elements means the Worker never has to build markup, only delete it.
- **The seed is base64url.**
  It needs no escaping inside HTML, JSON or a JavaScript string, so one plain string replacement works in the HTML and in the payload files, and it is kept far below the 1 KB at which React's payload would move it into a length-prefixed row.

## Alternatives considered

- **Rewrite the visible text and leave React's payload alone.**
  Ruled out: React would find text it did not render and report hydration errors.
- **Rewrite the server-rendered text inside React's payload.**
  Ruled out: long strings sit in length-prefixed rows that a text replacement corrupts, and the payload format is internal to Next.js.
- **Render the figures only in the browser.**
  Ruled out: crawlers and AI tools would lose the live figures.
- **Rebuild and redeploy the site every minute.**
  Ruled out: a deploy per minute, with the build pipeline as a single point of failure for freshness.

## Consequences

- Any new output that depends on the reading has to come from a view in `lib/reserve-view.ts`, and any element that exists only in one state needs its `data-rm` tag; otherwise the served HTML and the browser's first render can drift apart.
- The rolling block number assumes eight digits (`dd,ddd,ddd`), which holds until block 99,999,999, decades away at Ethereum's 12-second blocks.
- `next dev` has no Worker in front, so the pages read the chain on the server themselves there (`pageSeed` in `lib/reserve-seed.ts`).
- The mechanics are described in [serving.md](../reference/serving.md), section "Live figures".

## Plain version

The pages are made once, ahead of time, but the reserve numbers change all the time.
So the pages are made with blanks where the numbers go.
When someone loads a page, our code fills in the blanks with numbers read from the chain in the last minute, using the same code the page itself uses to show numbers.
Because the page in the browser works out exactly the same numbers from the same reading, nothing on the screen jumps or gets corrected when it starts up.
