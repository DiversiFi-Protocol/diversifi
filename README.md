# diversifi.tech

The marketing site for DFiUSD, the diversified USD stablecoin: home page, FAQ, terms, the whitepaper and audit PDFs, and the search and AI files. The app (swap, mint, redeem) lives at https://app.diversifi.tech.

Next.js (App Router) + TypeScript + viem, built as a static export and served on Cloudflare Workers by a small hand-written Worker (`worker/`) that adds the live reserve figures and the security headers.

```bash
npm install
npm run dev        # http://localhost:3000, the pages only
npm run preview    # build, then serve as deployed with wrangler dev on http://localhost:8787
```

Settings, Cloudflare resources, the cutover and rollback, and the go-live checklist: see [HANDOVER.md](HANDOVER.md).
