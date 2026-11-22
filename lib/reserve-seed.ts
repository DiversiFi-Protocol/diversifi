import { FALLBACK_READING, readReserve, type ReserveReading } from './reserve';

/**
 * The reserve reading a page first renders with, carried as one opaque string prop so the Worker can swap it in
 * the page's HTML and in its client-navigation payloads (`*.txt`) without parsing either.
 *
 * The static build always passes SEED_PLACEHOLDER; the Worker (worker/index.ts) replaces every occurrence with an
 * encoded live reading. Base64url keeps the value free of characters that need escaping in HTML, JSON or a JS string.
 */
export const SEED_PLACEHOLDER = 'RESERVE_SEED_PLACEHOLDER_9d41c7';

export type ReserveSeed = { reading: ReserveReading; ok: boolean };

// Compact positional form keeps the encoded seed short (well under the 1 KB at which React's payload moves a
// string into a length-prefixed text row, which a plain string swap would corrupt).
type Packed = [coins: [number, number, number][], total: number, block: number, readAt: number, mintFee: number, burnFee: number, mintEnabled: 0 | 1, maxReserves: number, ok: 0 | 1];

const toBase64Url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

export function encodeSeed({ reading, ok }: ReserveSeed): string {
  const packed: Packed = [
    reading.coins.map(c => [c.held, c.target, c.current]),
    reading.total, reading.block, reading.readAt, reading.mintFee, reading.burnFee,
    reading.mintEnabled ? 1 : 0, reading.maxReserves, ok ? 1 : 0,
  ];
  return toBase64Url(JSON.stringify(packed));
}

/** Returns null for the placeholder (the page is the build-time template) or anything unreadable. */
export function decodeSeed(seed: string): ReserveSeed | null {
  if (seed === SEED_PLACEHOLDER) return null;
  try {
    const [coins, total, block, readAt, mintFee, burnFee, mintEnabled, maxReserves, ok] = JSON.parse(fromBase64Url(seed)) as Packed;
    if (coins.length !== FALLBACK_READING.coins.length) return null;
    return {
      reading: {
        coins: FALLBACK_READING.coins.map((c, i) => ({ t: c.t, held: coins[i][0], target: coins[i][1], current: coins[i][2] })),
        total, block, readAt, mintFee, burnFee, mintEnabled: mintEnabled === 1, maxReserves,
      },
      ok: ok === 1,
    };
  } catch {
    return null;
  }
}

/** One reserve read with the same fallback the pages always had: the last known reading, marked as not live. */
export async function readSeed(): Promise<ReserveSeed> {
  try { return { reading: await readReserve(), ok: true }; } catch { return { reading: FALLBACK_READING, ok: false }; }
}

/**
 * What a page passes down. `next build` (static export) gets the placeholder for the Worker to fill;
 * `next dev` has no Worker in front, so it reads the chain itself.
 */
export async function pageSeed(): Promise<string> {
  return process.env.NODE_ENV === 'development' ? encodeSeed(await readSeed()) : SEED_PLACEHOLDER;
}
