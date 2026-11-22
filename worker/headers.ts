import { isProdHost, SITE_URL } from '../lib/site';

// Content Security Policy: the browser only runs our own scripts (plus Cloudflare Web Analytics) and only talks to the
// Ethereum connections listed here (for the live reserve figures). Anything else, e.g. an injected third-party script or
// a call to an unknown server, is blocked. The site has no wallet connection: the app lives at app.diversifi.tech.
// Next.js static pages need inline scripts, so 'unsafe-inline' stays for script-src.
const CSP = [
  "default-src 'self'",
  // Cloudflare Web Analytics: the edge injects its beacon script, which reports visits to cloudflareinsights.com.
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://cloudflareinsights.com https://ethereum-rpc.publicnode.com https://eth.drpc.org https://eth.llamarpc.com https://*.g.alchemy.com",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY', // older browsers; frame-ancestors covers modern ones
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
};

/** Pages, the 404 page and any other path that is not a file or under /_next/ or /api/ (the old middleware's matcher). */
const PAGE_PATH = /^\/(?!_next\/|api\/|.*\.(?:png|svg|ico|woff2|txt|xml|pdf)$)/;

/**
 * The security headers, plus a noindex header that keeps preview hosts (workers.dev, localhost) out of search indexes
 * and Link headers (RFC 8288) that advertise the sitemap and llms.txt to agents.
 */
export function addPageHeaders(request: Request, headers: Headers) {
  if (!PAGE_PATH.test(new URL(request.url).pathname)) return;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!isProdHost(host)) headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Link', `<${SITE_URL}/sitemap.xml>; rel="sitemap"; type="application/xml", <${SITE_URL}/llms.txt>; rel="describedby"; type="text/plain"`);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
}
