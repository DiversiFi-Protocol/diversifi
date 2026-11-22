import './build-env';
import { llmsTxt } from '../lib/llms';
import { encodeSeed, readSeed, SEED_PLACEHOLDER, type ReserveSeed } from '../lib/reserve-seed';
import { initialViewValues, TOKEN_PATTERN } from '../lib/reserve-view';
import { robotsTxt } from '../lib/robots';
import { addPageHeaders } from './headers';

/*
 * The site's only server code. Next.js builds the site into plain files (out/), served through Workers Static Assets;
 * this Worker sits in front of them and adds what static files cannot do:
 * - the live reserve figures in the home page, the FAQ and their client-navigation payloads, filled in from one
 *   reserve read per minute (see lib/reserve-view.ts for how the page template and the hydration stay in step);
 * - llms.txt with the live reserve table, rebuilt hourly, and robots.txt for the requesting host;
 * - the security, Link and noindex headers, the 308 redirect off a trailing slash, and the 404 page.
 */

const SEED_TTL_SECONDS = 60; // pages re-read the chain at most once a minute, like the old ISR revalidate
const LLMS_TTL_SECONDS = 3600;
const STALE_WHILE_REVALIDATE = 'stale-while-revalidate=2592000';
const NOT_FOUND_CACHE = 'private, no-cache, no-store, max-age=0, must-revalidate';
const CACHE_ORIGIN = 'https://worker-cache.diversifi.internal';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Old URLs used trailing slashes (/terms/); one permanent redirect to the canonical form.
    if (path.length > 1 && path.endsWith('/')) {
      return new Response(null, { status: 308, statusText: 'Permanent Redirect', headers: { Location: path.replace(/\/+$/, '') + url.search } });
    }
    if (path === '/robots.txt') {
      return new Response(robotsTxt(request.headers.get('host')), { statusText: 'OK', headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
    }
    if (path === '/llms.txt') {
      const llms = await cached('llms', LLMS_TTL_SECONDS, ctx, async () => {
        const seed = await seedFor(ctx);
        return llmsTxt(seed.value.ok ? seed.value.reading : null);
      });
      return new Response(llms.value, { statusText: 'OK', headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': `s-maxage=${llms.secondsLeft}, ${STALE_WHILE_REVALIDATE}` } });
    }

    // HEAD reads the file as GET so its headers (cache-control, ETag) are the ones GET would send.
    const isHead = request.method === 'HEAD';
    const response = await serveFile(isHead ? new Request(request, { method: 'GET' }) : request, env, ctx, path);
    const headers = new Headers(response.headers);
    if (response.status === 404) headers.set('cache-control', NOT_FOUND_CACHE);
    addPageHeaders(request, headers);
    if (isHead) await response.body?.cancel();
    return new Response(isHead ? null : response.body, { status: response.status, statusText: response.statusText, headers });
  },
} satisfies ExportedHandler<Env>;

/** A page (`/faq` → faq.html), a client-navigation payload (*.txt) or a plain file, with the live reading filled in. */
async function serveFile(request: Request, env: Env, ctx: ExecutionContext, path: string): Promise<Response> {
  const isPage = !path.slice(1).includes('.') && path !== '/404' && path !== '/_not-found';
  // The build's own .html files are only reachable through their clean paths, as before.
  if (path.endsWith('.html') || path === '/404' || path === '/_not-found') return notFound(request, env);

  const assetPath = path === '/' ? '/index.html' : isPage ? `${path}.html` : path;
  const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, request.url), request));
  if (asset.status === 404) return notFound(request, env);
  if (!(isPage || path.endsWith('.txt')) || asset.status !== 200) return asset;

  const body = await asset.text();
  // Pages without live figures (/terms) never change between deploys.
  if (!body.includes(SEED_PLACEHOLDER)) return withCache(new Response(body, asset), isPage ? `s-maxage=31536000, ${STALE_WHILE_REVALIDATE}` : null);
  const seed = await seedFor(ctx);
  const headers = new Headers(asset.headers);
  headers.delete('etag'); // the body below is not the file the ETag describes
  headers.delete('content-length');
  headers.set('cache-control', `s-maxage=${seed.secondsLeft}, ${STALE_WHILE_REVALIDATE}`);
  const filled = fillTemplate(body, seed.value);
  if (!isPage) return new Response(filled, { status: 200, statusText: 'OK', headers });
  // Keep only the elements of the first-render mode the reading is in (data-rm, see lib/reserve-view.ts).
  const drop = seed.value.ok ? 'unavailable' : 'live';
  return new HTMLRewriter()
    .on(`[data-rm="${drop}"]`, { element: element => { element.remove(); } })
    .transform(new Response(filled, { status: 200, statusText: 'OK', headers }));
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);

/** Swaps the seed placeholder for the encoded reading and every view token for its value, escaped as React escapes. */
function fillTemplate(body: string, seed: ReserveSeed): string {
  const values = initialViewValues(seed);
  const missing = new Set<string>();
  const filled = body
    .replaceAll(SEED_PLACEHOLDER, encodeSeed(seed))
    .replace(TOKEN_PATTERN, (_, kind: string, key: string) => {
      const value = values[key];
      if (value === undefined) { missing.add(key); return ''; }
      return kind === 'raw' ? value : escapeHtml(value);
    });
  if (missing.size) console.error('reserve template tokens without a value:', [...missing].join(', '));
  return filled;
}

async function notFound(request: Request, env: Env): Promise<Response> {
  const page = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url), request));
  return new Response(page.body, { status: 404, statusText: 'Not Found', headers: page.headers });
}

function withCache(response: Response, cacheControl: string | null): Response {
  if (!cacheControl) return response;
  const copy = new Response(response.body, response);
  copy.headers.set('cache-control', cacheControl);
  return copy;
}

/* ---------- edge cache: one reserve read per minute, one llms.txt build per hour ---------- */

const seedFor = (ctx: ExecutionContext) =>
  cached('reserve-seed', SEED_TTL_SECONDS, ctx, async () => JSON.stringify(await readSeed())).then(entry => ({ ...entry, value: JSON.parse(entry.value) as ReserveSeed }));

type Entry = { value: string; storedAt: number };
const memory = new Map<string, Entry>();
const inFlight = new Map<string, Promise<Entry>>();

/**
 * A value rebuilt at most once per `ttlSeconds` in each Cloudflare location: kept in this isolate's memory and in the
 * Cache API (which also works across isolates; on *.workers.dev it does nothing, so only the memory copy applies),
 * with concurrent misses sharing one rebuild.
 */
async function cached(name: string, ttlSeconds: number, ctx: ExecutionContext, build: () => Promise<string>) {
  const now = Date.now();
  const fresh = (entry: Entry | undefined) => entry && now - entry.storedAt < ttlSeconds * 1000;
  const result = (entry: Entry) => ({ value: entry.value, secondsLeft: Math.max(0, Math.ceil(ttlSeconds - (Date.now() - entry.storedAt) / 1000)) });

  const inMemory = memory.get(name);
  if (fresh(inMemory)) return result(inMemory!);

  const key = `${CACHE_ORIGIN}/${name}`;
  const cache = await caches.open('diversifi-worker');
  const hit = await cache.match(key);
  if (hit) {
    const entry = { value: await hit.text(), storedAt: Number(hit.headers.get('x-stored-at')) };
    if (fresh(entry)) { memory.set(name, entry); return result(entry); }
  }

  let pending = inFlight.get(name);
  if (!pending) {
    pending = build().then(value => {
      const entry = { value, storedAt: Date.now() };
      memory.set(name, entry);
      ctx.waitUntil(cache.put(key, new Response(value, { headers: { 'cache-control': `max-age=${ttlSeconds}`, 'x-stored-at': String(entry.storedAt) } })));
      return entry;
    }).finally(() => inFlight.delete(name));
    inFlight.set(name, pending);
  }
  // Keeps the shared rebuild alive if the request that started it (or this one) disconnects.
  ctx.waitUntil(pending);
  return result(await pending);
}
