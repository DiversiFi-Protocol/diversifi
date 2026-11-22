# Dependencies: pins, audits and fork decisions

This file owns the audit record for the site's third-party dependencies: which exact versions are pinned, how each was checked, what was found, and whether it should be forked.
The rules it follows are in the `dependency-management` skill (`~/.agents/skills/dependency-management/SKILL.md`).
Plain version: this is the list of outside code the site uses, with notes on how each piece was checked for problems.

## How versions are pinned

Every entry in `package.json` (`dependencies` and `devDependencies`) is an exact version, never a range.
`.npmrc` sets `save-exact=true`, so a new `npm install <package>` also writes an exact version.
`package-lock.json` pins every transitive package and is committed with every dependency change.
`overrides` in `package.json` forces a transitive package onto a fixed version when no parent release has moved to it; each override is listed below with its reason.
Plain version: the site always installs the same versions of everything, and the few places where we force a different version than a package asked for are written down here.

## Lockfile-wide checks

Last run on 2026-11-18, after the security fixes below, on the 342 installed packages.

- `npm audit`: 0 vulnerabilities.
- `npm audit signatures` (npm 11.6.2): 342 packages have verified registry signatures, and 103 have verified provenance attestations.
  The repository's npm 9.2 cannot run this check, because it fails on an expired registry key (`EEXPIREDSIGNATUREKEY`) instead of using the current one.
- Packages with install scripts: `bufferutil` 4.1.0, `esbuild` 0.28.2, `fsevents` 2.3.3, `utf-8-validate` 5.0.10 and `workerd` 1.20261101.1.
  This set did not change with the security fixes.
  All five arrive through the Cloudflare tooling (`wrangler` and `@opennextjs/cloudflare`); `esbuild` and `workerd` download their platform binary, and `bufferutil` and `utf-8-validate` build an optional native add-on.

## Direct dependencies

The tree size counts every package installed because of that dependency; "only via this" counts the ones no other direct dependency also needs.

| Package | Version | Where it runs | Tree size | Only via this | Audit status |
|---|---|---|---|---|---|
| `next` | 16.4.5 | build, server and browser | 53 | 0 | Lockfile-wide checks only |
| `react` | 19.2.9 | server and browser | 0 | 0 | Lockfile-wide checks only |
| `react-dom` | 19.2.9 | server and browser | 2 | 0 | Lockfile-wide checks only |
| `viem` | 2.57.14 | server and browser (read-only contract calls) | 12 | 11 | Lockfile-wide checks only |
| `@opennextjs/cloudflare` | 1.20.17 | build, and its runtime is bundled into the worker | 386 | 271 | Full audit of the 1.20.16 to 1.20.17 upgrade, 2026-11-18 |
| `wrangler` | 4.156.1 | build and deploy | 90 | 0 | Lockfile-wide checks only |
| `typescript` | 5.9.3 | build | 0 | 0 | Lockfile-wide checks only |
| `@types/node` | 20.19.43 | type checking only | 1 | 0 | Lockfile-wide checks only; pinned from `^20` on 2026-11-18 to the version the lockfile already held |
| `@types/react` | 19.2.2 | type checking only | 1 | 0 | Lockfile-wide checks only |
| `@types/react-dom` | 19.2.2 | type checking only | 2 | 0 | Lockfile-wide checks only |

"Lockfile-wide checks only" means the version passed the checks above, but has not yet had a per-package review of its published contents against its source or a fork decision.
That per-package review is still owed for those packages.

## Security fixes on 2026-11-18

Three Dependabot alerts were open, all on transitive packages, and Dependabot's own update run failed, so they were fixed by hand.

### glob (GHSA-5j98-mcp5-4vw2, high)

- **Advisory:** the `glob` command line tool runs matched file names through a shell when given `-c`/`--cmd`, which allows command injection; versions 10.2.0 up to 10.5.0 are affected.
- **Where it was:** `glob` 10.3.3, pulled in by `@node-minify/core` 9.0.2, which `@opennextjs/aws` 4.1.15 used to minify the build output.
- **Reach:** build time only, and the site's build never runs the `glob` command line tool, so nothing could reach the flaw.
- **Fix:** bumped `@opennextjs/cloudflare` from 1.20.16 to 1.20.17, which brings `@opennextjs/aws` 4.1.16 and `@node-minify/core` 10.5.0; that release no longer depends on `glob` at all.

### minimatch (GHSA-g3hv-75wg-m249, medium)

- **Advisory:** crafted patterns can make `minimatch` expand into a huge number of "globparts" and stall (denial of service); versions 7.0.0 up to 11.0.1 are affected.
- **Where it was:** `minimatch` 10.2.6 under `glob` 13.0.6, which `@opennextjs/cloudflare` uses to find files during the build.
  The newest `@opennextjs/cloudflare` (1.20.17) still asks for `glob ^13.0.6`, and every `glob` 13 release asks for `minimatch ^10`, so no parent bump clears it.
- **Reach:** build time only, with patterns written by OpenNext itself, never by a visitor.
- **Fix:** `overrides` pins `glob` to 14.0.6, which moved to `minimatch ^11.0.5`; the lockfile resolves `minimatch` 11.0.9.
  Overriding `minimatch` alone under `glob` 13 was ruled out: `minimatch` 11 is a rewrite that dropped the `MMRegExp` and `AST` exports, and `glob` 14 is the release its author made to work with it.
  `glob` 14's public API only adds to `glob` 13's (`readonly` option types, a `Form` type and a Unicode normalization option), and `@opennextjs/cloudflare` only calls `glob` and `globSync`.
  Verified by a full `npx opennextjs-cloudflare build` and by serving the result in local `workerd`.
- **Remove when:** an `@opennextjs/cloudflare` release depends on `glob` 14 or later.

### zod (GHSA-mrhx-c7xc-m3w5, high)

- **Advisory:** validating oversized collections with size limits can exhaust memory; every version below 4.6.6 is affected, so the fix is a major version for anything on zod 3.
- **Where it was:** `zod` 3.25.76, installed only as an optional peer of `abitype` 1.2.3, which `viem` uses.
  Nothing in the site imports `zod`, and the npm package does not appear in the browser bundle or the worker.
  (`next` ships its own internal copy of zod for checking its config at build time; Dependabot does not track that copy and it never sees visitor input.)
- **Reach:** none in this site; the package is installed but never loaded.
- **Fix:** `overrides` pins `zod` to 4.6.6, the smallest fixed version; `abitype` accepts `^3.22.0 || ^4.0.0`.
  The newest `viem` (2.58.0) and `abitype` (1.3.0) still leave this peer open, so no parent bump clears it.
- **Remove when:** `abitype` stops pulling in the optional peer, or a parent pins zod 4.6.6 or later.

### What else moved

Re-resolving the lockfile also moved these transitive packages within their existing ranges: `@node-minify/terser` and `@node-minify/utils` 9.0.1 to 10.5.0, `terser` 5.36.0 to 5.46.0, `gzip-size` 6.0.0 to 7.0.0, `path-scurry` 2.0.2 to 3.0.0, `brace-expansion` 5.0.12 to 5.0.13, `router` 2.2.0 to 2.3.0, `object-inspect` 1.13.4 to 1.14.0, `@smithy/core` 3.40.0 to 3.41.0, and five `@aws-sdk/middleware-*` packages by one patch version.
New packages: `@isaacs/nonrecursive-glob-match` 1.1.0 (the matcher inside `minimatch` 11), plus `fast-glob` and its helpers (`micromatch`, `picomatch`, `braces`, `@nodelib/fs.*` and others) under `@node-minify/utils` 10.5.0, and `resolve.exports`.
Removed: the old `glob` 10 tree under `@node-minify/core` (`jackspeak`, `@isaacs/cliui`, `foreground-child`, `cross-spawn` and their helpers).

### Audit of the changed versions

- **Advisories:** none open for any version in the lockfile (`npm audit`).
- **Install scripts:** none of the changed or new packages has one.
- **Published package against source:** `@opennextjs/cloudflare` 1.20.17, `@opennextjs/aws` 4.1.16, the `@node-minify` 10.5.0 packages, `glob` 14.0.6, `minimatch` 11.0.9 and `zod` 4.6.6 carry SLSA provenance attestations, and npm verified them.
  `@isaacs/nonrecursive-glob-match` 1.1.0 has no provenance and no `repository` field; its published `src/` files are byte-identical to `github.com/isaacs/nonrecursive-glob-match` at the `1.1.0` commit `0ac7bea`, and its built code has no process, network or `eval` use.
  It declares a `prepare` script, which npm does not run when installing from the registry.
  `path-scurry` 3.0.0 and `brace-expansion` 5.0.13 have no provenance; their published commits (`31124d9`, `420ede4`) exist in their repositories as the release commits for those versions.
- **Changes since the last version:** read the `@opennextjs/cloudflare` 1.20.16 to 1.20.17 and `@opennextjs/aws` 4.1.15 to 4.1.16 diffs.
  They change how routes are matched and how path parameters are decoded and escaped, how the cache-purge and revalidation-queue Durable Objects record their state, and how `workerd` builds are resolved.
  No new network destinations, process spawning or `eval` were added.

## Fork decisions

### @opennextjs/cloudflare

- **Sub-dependencies: high.** 386 packages in its tree, 271 of them there only because of it, including the AWS SDK clients that `@opennextjs/aws` pulls in although this site does not run on AWS.
- **Surface area: high.** About 556 KB unpacked for itself plus 749 KB for `@opennextjs/aws`, of which the site uses the Cloudflare build and the worker runtime.
- **Attack target value: high.** It runs during the build and writes the worker that serves every visitor, so a compromised release could change what users receive.
- **Author credibility: high.** Published by Cloudflare's frameworks account from CI with provenance; `@opennextjs/aws` is published by the SST team, also with provenance.
- **Decision: a fork is indicated but not made.** All three criteria score high, which the rules say calls for a fork even from a credible author.
  It is not done in this change because it is a large, ongoing commitment that the owner should decide on; it is flagged in the hand-over instead.

Plain version: this package pulls in hundreds of others, is much bigger than what we use, and builds the code every visitor gets, so the rules say we should keep our own cut-down copy.
That is a big job, so it is written down here for the owner to decide rather than done quietly.

### Transitive packages changed in this fix

`glob`, `minimatch`, `zod` and the rest are not direct dependencies, so they are not fork candidates on their own; they would be covered by a fork of the direct dependency that brings them in.
