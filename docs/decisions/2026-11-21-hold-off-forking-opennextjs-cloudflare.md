# Hold off on forking @opennextjs/cloudflare for now

- **Status:** decided.
- **Decided by:** Stephen, on 2026-11-21.

## Question

Should the site fork and strip `@opennextjs/cloudflare`, the tool that builds the worker serving every visitor, as the dependency rules indicate?

## Context

The fork scoring in [dependencies.md](../reference/dependencies.md), section "@opennextjs/cloudflare", rates all three criteria high: sub-dependencies (386 packages in its tree, 271 only there because of it), surface area, and value as an attack target.
The rules in the `dependency-management` skill say that three high scores call for a fork even from a credible author, and the author here (Cloudflare, publishing from CI with provenance) is credible.
The previous change recorded the fork as indicated but not made, and left the choice to the owner in HANDOVER.md.

## Decision

Do not fork `@opennextjs/cloudflare` for now.
The site keeps depending on the upstream package at an exact pinned version.
The decision is open to revisiting at any time.

## Reasoning

Stephen's instruction was to hold off for now.
He gave no further reasoning, so none is recorded here; the scoring itself was not disputed, and still indicates a fork.

## Alternatives considered

- **Fork now, as the scoring indicates.**
  Deferred by this decision, not ruled out for good.
  A fork is a large, ongoing commitment: building a stripped copy, publishing it as a public repository under the same owner, and rebasing and re-auditing it on every upstream release.

## Consequences

- HANDOVER.md and dependencies.md no longer present the fork as a pending to-do.
- The upstream package stays exactly pinned, and every upgrade of it still gets the audit the `dependency-management` rules require, recorded in dependencies.md.
- Reopening the fork needs only a new decision record that supersedes this one.

## Plain version

The rules say this build tool is risky enough that we should keep our own trimmed copy of it.
Stephen decided not to do that yet.
For now the site keeps using the official package, locked to one exact version and checked each time it is upgraded.
He can change his mind later, and then a new note gets written.
