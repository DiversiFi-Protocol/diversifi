import { COINS } from './coins';
import { faqs, faqSlots, faqText, type Faq } from './faq';
import { fmtBlock, fmtK, hhmm, type ReserveMode, type ReserveReading } from './reserve';
import type { ReserveSeed } from './reserve-seed';

/*
 * Every piece of page output that depends on the reserve reading, as plain strings.
 *
 * The components render these views. The static build renders them as tokens (`@@r:<key>@@`), and the Worker
 * replaces each token with the same view computed from a live reading (initialViewValues), so the HTML it serves
 * is exactly what React renders on the client from that reading and hydration finds nothing to correct.
 * Structure (which elements exist) never comes from a view: elements that only exist in one first-render mode
 * carry `data-rm="live"` or `data-rm="unavailable"`, the build renders both, and the Worker drops the other one.
 */

type Leaf = string;
type Tree = Leaf | readonly Tree[] | { readonly [key: string]: Tree };

const TOKEN = (key: string) => `@@r:${key}@@`;
/** A token whose value goes into a script element unescaped; its view value must already be script-safe. */
const RAW_TOKEN = (key: string) => `@@raw:${key}@@`;
export const TOKEN_PATTERN = /@@(r|raw):([A-Za-z0-9.]+)@@/g;

/** The same shape as `view`, with every string replaced by its token. */
export function tokenize<T extends Tree>(view: T, prefix: string): T {
  if (typeof view === 'string') return (prefix.endsWith('.ld') ? RAW_TOKEN(prefix) : TOKEN(prefix)) as T;
  if (Array.isArray(view)) return view.map((v, i) => tokenize(v, `${prefix}.${i}`)) as unknown as T;
  return Object.fromEntries(Object.entries(view).map(([k, v]) => [k, tokenize(v as Tree, `${prefix}.${k}`)])) as T;
}

function flatten(view: Tree, prefix: string, out: Record<string, string>) {
  if (typeof view === 'string') out[prefix] = view;
  else if (Array.isArray(view)) view.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
  else for (const [k, v] of Object.entries(view)) flatten(v as Tree, `${prefix}.${k}`, out);
  return out;
}

/** Which first-render mode an element belongs to (see the note at the top). */
export type RenderMode = 'live' | 'unavailable';
export const firstMode = (ok: boolean): RenderMode => (ok ? 'live' : 'unavailable');

/* ---------- hero panel (components/home.tsx ReservePanel) ---------- */
export function panelView(reading: ReserveReading, mode: ReserveMode, ageMin: number) {
  const t = hhmm(reading.readAt);
  const rail = {
    live: { text: `LIVE · ${t} UTC`, color: 'var(--fg)' },
    loading: { text: 'LOADING', color: 'var(--dim)' },
    stale: { text: `AS OF ${t} UTC · ${ageMin} MIN OLD`, color: 'var(--warn)' },
    unavailable: { text: 'UNAVAILABLE', color: 'var(--dim)' },
  }[mode];
  return {
    railText: rail.text,
    railColor: rail.color,
    heartbeatOpacity: mode === 'live' ? '1' : '0',
    lastAt: t,
    blockText: fmtBlock(reading.block),
    footLink: mode === 'unavailable' ? 'check it directly on etherscan →' : 'view the contract on Etherscan →',
  };
}

/** The rolling block number. Its cells assume the 8-digit format (dd,ddd,ddd), which holds until block 99,999,999. */
export function rollView(block: number) {
  const text = fmtBlock(block);
  return { text, cells: text.split('').map(ch => (/\d/.test(ch) ? `translateY(-${ch}em)` : ch)) };
}

/* ---------- reserve bar (components/ReserveBar.tsx) ---------- */
export type BarProps = { size: 'lg' | 'md' | 'sm'; readout: boolean; showTotal: boolean; status: boolean };
/** The only bar on the site: the hero panel's. The Worker renders its first frame with these props. */
export const HERO_BAR: BarProps = { size: 'md', readout: true, showTotal: false, status: true };
/** First-render state of the bar: before the ResizeObserver reports a width and before the settle animation. */
export const BAR_FIRST_STATE = { width: 560, progress: 0, shown: false, hover: -1 };
export type BarState = typeof BAR_FIRST_STATE;

export function barView(reading: ReserveReading, mode: ReserveMode, props: BarProps, state: BarState) {
  const loading = mode === 'loading';
  const data = reading.coins;
  const minCol = (state.width - 12) * Math.min(...data.map(c => c.current)) / 100;
  const stagger = props.size !== 'sm' && minCol < (props.size === 'lg' ? 64 : 52);
  const tickerFs = minCol < 36 ? 11 : props.size === 'lg' ? 13 : 12;
  const shareFs = minCol < 36 ? 13 : minCol < 48 ? 16 : props.size === 'lg' ? 24 : 16;
  const asOf = hhmm(reading.readAt) + ' UTC';
  // Balanced when every coin is within 0.05 percentage points of its target; issuers counted from the coin list (DAI and USDS share one).
  const balanced = data.every(c => Math.abs(c.current - c.target) < 0.05);
  const issuers = new Set(COINS.map(c => c.issuer)).size;

  const h = state.hover >= 0 && !loading ? state.hover : -1;
  const hc = h >= 0 ? data[h] : null;
  const rd = hc
    ? { label: hc.t, color: COINS[h].color, value: hc.current.toFixed(1) + '%', scope: (props.showTotal ? fmtK(hc.held) + ' held · ' : '') + 'target ' + hc.target.toFixed(1) + '% · as of ' + asOf }
    : props.status
      ? { label: 'RESERVE STATUS', color: '', value: loading ? '—' : balanced ? 'balanced' : 'off target', scope: loading ? 'reading the reserve contract' : `${issuers} issuers · ${data.length} coins · as of ${asOf}` }
      : { label: 'RESERVE', color: '', value: loading ? '—' : props.showTotal ? fmtK(reading.total) : 'multi-issuer', scope: loading ? 'reading the reserve contract' : (props.showTotal ? 'every basket coin' : 'no single issuer') + ' · as of ' + asOf };

  return {
    rootOpacity: mode === 'unavailable' ? '0.35' : '1',
    tickerSize: `${tickerFs}px`,
    shareSize: `${shareFs}px`,
    coins: COINS.map((c, i) => ({
      segmentLabel: `${c.t}, ${data[i].current.toFixed(1)} percent of the reserve. Opens its balance on Etherscan.`,
      flex: `${data[i].current} 1 0px`,
      stemHeight: `${stagger && i % 2 ? 44 : 14}px`,
      labelAlign: stagger && i === COINS.length - 1 ? 'flex-end' : 'flex-start',
      // Pre-rendered HTML carries the final share; the count-up only runs once the bar is shown.
      share: loading ? '00.0%' : (data[i].current * (state.shown ? state.progress : 1)).toFixed(1) + '%',
    })),
    readout: { label: rd.label, color: rd.color, value: rd.value, scope: rd.scope },
  };
}

/* ---------- section 04 (components/home.tsx ReserveSection) ---------- */
export function sectionView(reading: ReserveReading, mode: ReserveMode, ageMin: number) {
  const t = hhmm(reading.readAt);
  const blk = fmtBlock(reading.block);
  return {
    rail: {
      live: `ETHEREUM · ${t} UTC · BLOCK ${blk}`,
      loading: 'ETHEREUM · LOADING',
      stale: `ETHEREUM · AS OF ${t} UTC · BLOCK ${blk}`,
      unavailable: `ETHEREUM · LAST READING ${t} UTC`,
    }[mode],
    readAt: t,
    ageMin: String(ageMin),
    coins: reading.coins.map(c => ({ held: fmtK(c.held), share: c.current.toFixed(1) })),
    total: fmtK(reading.total),
  };
}

/* ---------- /faq (components/FaqList.tsx) ---------- */
export function faqLd(items: Faq[]) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: faqText(f.a) } })),
  };
  return JSON.stringify(ld).replace(/</g, '\\u003c');
}
export const FAQ_SLOTS = { split: TOKEN('faq.split'), fee: TOKEN('faq.fee') };
export const FAQ_LD_TOKEN = RAW_TOKEN('faq.ld');

export function faqView(reading: ReserveReading, ok: boolean) {
  const items = faqs(reading, ok);
  return { faq: faqSlots(reading, ok), ld: faqLd(items) };
}

/**
 * Every token value for a page's first render, keyed like the tokens.
 * Mirrors the components' first render: no hover, the bar not yet shown, the reading just taken (age 0).
 */
export function initialViewValues({ reading, ok }: ReserveSeed): Record<string, string> {
  const mode = firstMode(ok);
  const out: Record<string, string> = {};
  flatten(panelView(reading, mode, 0), 'panel', out);
  flatten(rollView(reading.block), 'roll', out);
  flatten(barView(reading, mode, HERO_BAR, BAR_FIRST_STATE), 'bar', out);
  flatten(sectionView(reading, mode, 0), 'section', out);
  const faq = faqView(reading, ok);
  flatten(faq.faq, 'faq', out);
  out['faq.ld'] = faq.ld;
  return out;
}
