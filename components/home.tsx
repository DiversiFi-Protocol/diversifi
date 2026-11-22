'use client';

import { useEffect, useRef, useState } from 'react';
import { COINS, coinUrl, rmUrl } from '@/lib/coins';
import { FALLBACK_READING, fmtBlock } from '@/lib/reserve';
import { HERO_BAR, panelView, rollView, sectionView, tokenize } from '@/lib/reserve-view';
import { ReserveBar } from './ReserveBar';
import { useReserve } from './ReserveProvider';
import { ARCS, TokenIcon } from './brand';
import s from '@/app/home.module.css';

const reduced = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- 1d: market concentration ---------- */
const MARKET = [61, 9, 8, 7, 6, 5, 4];
const ALERT_EVERY = 5600;
const ALERT_MS = 1500;

export function MarketMorph() {
  // Stripes crawl on the 61% slice; every few seconds it flashes red. Reduced motion: still, never red.
  const [alert, setAlert] = useState(false);

  useEffect(() => {
    if (reduced()) return;
    let off = 0;
    const flash = () => { setAlert(true); off = window.setTimeout(() => setAlert(false), ALERT_MS); };
    const first = window.setTimeout(flash, 2400);
    const iv = window.setInterval(flash, ALERT_EVERY);
    return () => { clearTimeout(first); clearTimeout(off); clearInterval(iv); };
  }, []);

  const hot = alert ? 'var(--crit)' : 'var(--warn)';

  return (
    <div className={s.morph}>
      <div role="img" aria-label="Stablecoin market: one issuer holds 61% of supply, all other issuers share the other 39%. Source: DefiLlama." className={s.morphFig}>
        <div className={s.morphHead}>
          <span style={{ color: 'var(--fg)' }}>THE MARKET</span>
          <span style={{ color: hot, transition: 'color 400ms' }}>1 ISSUER · 61% · ALL OTHERS · 39%</span>
        </div>
        <div className={s.morphBar}>
          {MARKET.map((v, i) => (
            <i key={i} className={i === 0 && alert ? s.hot : undefined} style={{ flex: `${v} 1 0px`, background: i === 0 ? hot : 'var(--strong)' }}>
              {i === 0 && <b />}
            </i>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 1a/1e: live reserve panel ---------- */
function RollingBlock({ n, template }: { n: number; template: boolean }) {
  const roll = template ? tokenize(rollView(FALLBACK_READING.block), 'roll') : rollView(n);
  return (
    <span className={s.roll}>
      {/* The reels draw 0–9 with CSS generated content, so page text holds the block number once, not every reel digit. */}
      <span className="sr-only">{roll.text}</span>
      {roll.cells.map((cell, i) =>
        ROLL_DIGIT[i]
          ? <span key={i} className={s.digit} aria-hidden="true"><span style={{ transform: cell }} /></span>
          : <span key={i} aria-hidden="true">{cell}</span>
      )}
    </span>
  );
}
// Which cells of the block number are digits (the rest are commas); fixed so the template and the live frame agree.
const ROLL_DIGIT = fmtBlock(FALLBACK_READING.block).split('').map(ch => /\d/.test(ch));

export function ReservePanel() {
  const { reading, mode, refresh, ageMin, template } = useReserve();
  // intro: 0 = ring hidden, 1 = arcs drawing, 2 = ring out / bar in. Plays on every load.
  const [intro, setIntro] = useState(0);
  const [block, setBlock] = useState(reading.block);
  const [ago, setAgo] = useState(0);

  useEffect(() => {
    if (reduced()) { setIntro(2); return; }
    // Wait for the full page load and two painted frames, so a slow device or connection doesn't swallow the intro.
    let a = 0, b = 0, raf = 0;
    const go = () => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          a = window.setTimeout(() => setIntro(1), 200);
          b = window.setTimeout(() => setIntro(2), 2100);
        });
      });
    };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    return () => { window.removeEventListener('load', go); cancelAnimationFrame(raf); clearTimeout(a); clearTimeout(b); };
  }, []);

  // Block heartbeat: progress line fills over 12s, block number rolls each slot, re-synced on every read.
  useEffect(() => { setBlock(reading.block); setAgo(Math.floor((Date.now() - reading.readAt) / 1000) % 12); }, [reading.block, reading.readAt]);
  useEffect(() => {
    if (mode !== 'live' || reduced()) return;
    const iv = window.setInterval(() => setAgo(a => {
      if (a + 1 >= 12) { setBlock(b => b + 1); return 0; }
      return a + 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [mode]);

  // Figures come from the shared view (lib/reserve-view.ts); the static build renders its tokens and both
  // first-render modes, tagged data-rm for the Worker to keep one.
  const view = template ? tokenize(panelView(FALLBACK_READING, 'live', 0), 'panel') : panelView(reading, mode, ageMin);
  const live = template || mode === 'live';
  const unavailable = template || mode === 'unavailable';

  return (
    <section aria-label="live reserve" className={s.panel}>
      <div className={`rail ${s.panelRail}`}>
        <span>RESERVE · ETHEREUM</span>
        <i aria-hidden="true" className={s.hb} style={{ width: `${(ago / 12) * 100}%`, opacity: view.heartbeatOpacity, transition: ago === 0 ? 'none' : 'width 1s linear' }} />
        <span role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, color: view.railColor }}>
          {live && <span className="livedot" data-rm="live" />}{view.railText}
        </span>
      </div>
      <p className="h3">a basket of stablecoins, no single issuer.</p>
      {unavailable && <p className="small" data-rm="unavailable">reserve data couldn&apos;t load. <span className="dim">last reading {view.lastAt} UTC.</span></p>}
      <div style={{ position: 'relative' }}>
        <div style={{ opacity: intro >= 2 ? 1 : 0, transition: 'opacity 500ms' }}>
          <ReserveBar {...HERO_BAR} start={intro >= 2} />
        </div>
        <div aria-hidden="true" className={s.ring} style={{ opacity: intro >= 2 ? 0 : 1, transform: intro >= 2 ? 'scale(.55) rotate(120deg)' : 'none' }}>
          <svg viewBox="0 0 100 100" width={120} height={120}>
            <g fill="none" transform="rotate(-90 50 50)" strokeWidth={10}>
              {ARCS.map((a, i) => (
                <circle key={i} cx={50} cy={50} r={40} stroke={COINS[i].color} strokeDashoffset={a.o}
                  style={{ strokeDasharray: intro >= 1 ? a.d : '0 251.33', transition: `stroke-dasharray 800ms var(--ease) ${i * 130}ms` }} />
              ))}
            </g>
            <circle cx={50} cy={50} r={8} fill="var(--signal)" />
          </svg>
        </div>
      </div>
      <div className={s.panelFoot}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!template && mode === 'stale' && <button type="button" className="mini-btn" onClick={refresh}>refresh</button>}
          {!template && mode === 'loading' && <span className="skel">block 00,000,000</span>}
          {unavailable && <span data-rm="unavailable">last reading {view.lastAt} UTC</span>}
          {(live || mode === 'stale') && <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }} data-rm="live">block {live ? <RollingBlock n={block} template={template} /> : <span style={{ color: 'var(--fg)' }}>{view.blockText}</span>}</span>}
        </span>
        <a href={rmUrl} target="_blank" rel="noopener" className={s.footLink}>{view.footLink}</a>
      </div>
    </section>
  );
}

/* ---------- 03 mint diagram: cycles through the basket coins ---------- */
function useMintCycle() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const iv = window.setInterval(() => setIdx(i => (i + 1) % 7), 1800);
    return () => clearInterval(iv);
  }, []);
  const c = COINS[idx];
  return { idx, coin: c };
}

export function MintDots() {
  const { idx, coin } = useMintCycle();
  return (
    <>
      <div className={s.diaHead}>
        <span className="label-sm">DEPOSIT BASKET COINS</span>
        <span style={{ display: 'flex', gap: 3 }}>{COINS.map((k, i) => <i key={k.t} className={s.mintDot} style={{ background: k.color, opacity: i === idx ? 1 : 0.28 }} />)}</span>
      </div>
      <div className={s.diaRow}>
        <span className="chip" style={{ minWidth: 96 }}><i className="sw" style={{ background: coin.color, transition: 'background-color 400ms' }} />{coin.t}</span>
        <span className="mono dim">→</span>
        <DfiChipInline />
      </div>
    </>
  );
}
function DfiChipInline() {
  return (
    <span className="chip" style={{ fontWeight: 600 }}>
      <svg viewBox="0 0 100 100" width={16} height={16} aria-hidden="true"><circle cx={50} cy={50} r={50} fill="#BFEFFF" /><circle cx={50} cy={50} r={30} fill="none" stroke="#0D0E10" strokeWidth={12} /><circle cx={50} cy={50} r={9} fill="#0D0E10" /></svg>DFiUSD
    </span>
  );
}

/* ---------- 04 the reserve ---------- */
export function ReserveSection() {
  const { reading, mode, refresh, ageMin, template } = useReserve();
  const view = template ? tokenize(sectionView(FALLBACK_READING, 'live', 0), 'section') : sectionView(reading, mode, ageMin);
  const unavailable = template || mode === 'unavailable';
  const rows = COINS.map((c, i) => ({ ...c, d: view.coins[i], url: coinUrl(c), aria: `${c.t} held by the reserve, on Etherscan` }));

  return (
    <section id="reserve" className={`wrap ${s.section}`}>
      <div className="rail"><span>04 · THE RESERVE</span><span>{view.rail}</span></div>
      <h2 className="h2" style={{ marginTop: 40 }}>the reserve, coin by coin.</h2>
      {unavailable && (
        <p style={{ marginTop: 24 }} data-rm="unavailable">reserve data couldn&apos;t load. <span className="dim">last reading {view.readAt} UTC.</span> <a href={rmUrl} target="_blank" rel="noopener">check it directly on etherscan →</a></p>
      )}
      {!template && mode === 'stale' && (
        <p className="mono" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--warn)' }}>
          THIS READING IS {view.ageMin} MIN OLD <button type="button" className="mini-btn" onClick={refresh}>refresh</button>
        </p>
      )}

      <div className={s.tableWide}>
        <div role="table" aria-label="reserve composition" className={s.table}>
          <div role="row" className={`${s.tr} ${s.th}`}>
            <span role="columnheader">COIN</span><span role="columnheader">ISSUER</span>
            <span role="columnheader" className={s.r}>HELD</span><span role="columnheader" className={s.r}>SHARE</span>
            <span role="columnheader" className={s.r}>SOURCE</span>
          </div>
          {rows.map(c => (
            <div role="row" key={c.t} className={s.tr}>
              <span role="cell" className={s.coinCell}><i className="sw" style={{ background: c.color }} />{c.t}</span>
              <span role="cell" className={s.issuer}>{c.issuer}</span>
              <a role="cell" href={c.url} target="_blank" rel="noopener" className={`${s.r} ${s.cellLink}`} style={{ fontWeight: 600 }} tabIndex={-1}>{c.d.held}</a>
              <a role="cell" href={c.url} target="_blank" rel="noopener" className={`${s.r} ${s.cellLink}`} style={{ color: 'var(--dim)' }} tabIndex={-1}>{c.d.share}%</a>
              <a role="cell" href={c.url} target="_blank" rel="noopener" aria-label={c.aria} className={`${s.r} ${s.src}`}>balance →</a>
            </div>
          ))}
          <div role="row" className={`${s.tr} ${s.total}`}>
            <span role="cell" className="label">TOTAL</span>
            <span role="cell" className={s.issuer} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg)' }}><TokenIcon size={16} />DiversiFi</span>
            <a role="cell" href={rmUrl} target="_blank" rel="noopener" className={`${s.r} ${s.cellLink}`} style={{ fontWeight: 600 }} tabIndex={-1}>{view.total}</a>
            <span role="cell" className={s.r} style={{ color: 'var(--dim)' }}>100.0%</span>
            <a role="cell" href={rmUrl} target="_blank" rel="noopener" aria-label="ReserveManagerV1 on Etherscan" className={`${s.r} ${s.src}`}>ReserveManagerV1 →</a>
          </div>
        </div>
      </div>

      <div role="list" aria-label="reserve composition" className={`mono ${s.tableNarrow}`}>
        {rows.map(c => (
          <div role="listitem" key={c.t}>
            {/* One line per coin; the whole row links to the balance on Etherscan. */}
            <a href={c.url} target="_blank" rel="noopener" aria-label={c.aria} className={s.nRow}>
              <span className={s.nCoin}><i className="sw" style={{ background: c.color }} />{c.t}<span className={s.nIssuer}>{c.issuer}</span></span>
              <span className={s.nHeld}>{c.d.held}<span aria-hidden="true" className={s.nArrow}>↗</span></span>
            </a>
          </div>
        ))}
        <a href={rmUrl} target="_blank" rel="noopener" aria-label="ReserveManagerV1 on Etherscan" className={`${s.nRow} ${s.nTotal}`}>
          <span className={s.nCoin}><TokenIcon size={14} />TOTAL</span>
          <span className={s.nHeld}>{view.total}<span aria-hidden="true" className={s.nArrow}>↗</span></span>
        </a>
      </div>
    </section>
  );
}

/* ---------- 05 issuer-fails explainer: animation is the main element ---------- */
const FAIL_STEPS = [
  { title: 'the loss stays in its slice.', body: 'A failing coin affects only its share of the backing. The other coins sit in the reserve as before.', short: 'The loss stays in its slice. The other coins are untouched.' },
  { title: 'its target is set to 0%.', body: "The failing coin's target share can be set to 0%. The other targets take up its share.", short: 'Its target is set to 0%. The other coins take up its share.' },
  { title: 'swaps only run toward target.', body: 'Each swap moves the reserve closer to the new target, so the failing coin is pushed out over time.', short: 'Swaps only run toward target, pushing the coin out.' },
  { title: 'minting can be paused.', body: 'New mints can be stopped while the failing coin is still in the reserve.', short: 'New mints can pause while the coin is still held.' },
];
const STEP_MS = 3200;

export function IssuerExplainer() {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  // Autoplay 01→04 and loop while in view; a click jumps to that step and the loop carries on from there.
  // Reduced motion: end state, no loop.
  useEffect(() => {
    if (reduced()) { setStep(3); return; }
    let iv = 0;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(iv);
      if (e.isIntersecting) iv = window.setInterval(() => setStep(st => (st + 1) % 4), STEP_MS);
    }, { threshold: 0.4 });
    io.observe(root.current!);
    return () => { io.disconnect(); clearInterval(iv); };
  }, [run]);

  const pick = (i: number) => { setStep(i); setRun(r => r + 1); };

  return (
    <div ref={root} className={s.ex}>
      <div className={s.exRail}><span style={{ color: 'var(--crit)' }}>ONE ISSUER FAILS</span></div>

      <div role="tablist" aria-label="failure steps" className={s.exTabs}>
        {FAIL_STEPS.map((st, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === step} aria-controls="ex-caption" onClick={() => pick(i)}
            className={i < step ? s.exDone : i === step ? s.exOn : undefined}>
            <span className={s.exLine} aria-hidden="true">
              {i === step && <i key={`${step}-${run}`} className={s.exProg} style={{ animationDuration: `${STEP_MS}ms` }} />}
            </span>
            <span className={s.exNum}>0{i + 1}</span>
            <span className={s.exTab}>{st.title}</span>
          </button>
        ))}
      </div>

      <div className={s.exFig}>
        <div aria-hidden="true" className={s.ifGrid}>
          <span>NOW</span>
          <div className={s.ifBar} style={{ height: 40, opacity: step >= 3 ? 0.6 : 1, transition: 'opacity 900ms' }}>
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} style={{ flex: step >= 2 ? (i === 3 ? '0.2 1 0px' : '1.13 1 0px') : '1 1 0px', background: i === 3 ? 'var(--crit)' : 'var(--strong)', transition: 'flex-grow 1600ms cubic-bezier(.45,0,.2,1)' }} />
            ))}
          </div>
          <span style={{ opacity: step >= 1 ? 1 : 0.15, transition: 'opacity 900ms' }}>TARGET</span>
          <div className={s.ifBar} style={{ height: 16, opacity: step >= 1 ? 1 : 0.15, transition: 'opacity 900ms' }}>
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} style={{ flex: step >= 1 && i === 3 ? '0 1 0px' : '1 1 0px', background: 'var(--strong)', transition: 'flex-grow 1300ms cubic-bezier(.45,0,.2,1)' }} />
            ))}
          </div>
        </div>
        <div className={s.exSayRow}>
          <p id="ex-caption" role="tabpanel" aria-live="polite" key={step} className={s.exSay}>{FAIL_STEPS[step].short}</p>
          <span aria-hidden="true" className="chip chip-sm" style={{ flexShrink: 0, opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'scale(1)' : 'scale(1.35)', transition: 'opacity 500ms, transform 700ms cubic-bezier(.2,1.4,.4,1)' }}>
            <i className={s.pauseSq} />MINT · PAUSED
          </span>
        </div>
      </div>

      {/* All four steps in the HTML for crawlers and screen readers; the caption above shows one at a time. */}
      <ol className="sr-only">{FAIL_STEPS.map((st, i) => <li key={i}>{st.title} {st.body}</li>)}</ol>
    </div>
  );
}

/* ---------- 06 contract row: name, meta, address, copy, Etherscan ---------- */
const CopyIcon = () => <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.4}><rect x={5.5} y={5.5} width={8} height={8} rx={1.5} /><path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" /></svg>;
const CheckIcon = () => <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true"><path d="M3 8.5l3 3 7-7" fill="none" stroke="var(--ok)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></svg>;

export function ContractRow({ name, meta, address, href, token = false }: { name: string; meta: string; address: string; href: string; token?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(address); } catch { return; }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={s.ct}>
      <div className={s.ctHead}>
        <span className={s.ctName}>{token && <TokenIcon size={16} />}{name}</span>
        <span className={s.ctMeta}>{meta}</span>
      </div>
      <div className={s.ctAddr}>
        {/* Full address where it fits; a middle-shortened one on phones. Copy always takes the full address. */}
        <span className={s.ctFull}>{address}</span>
        <span className={s.ctShort} aria-hidden="true">{address.slice(0, 10)}…{address.slice(-8)}</span>
        <span className={s.ctBtns}>
          <button type="button" onClick={copy} className={s.iconBtn} aria-label={copied ? `${name} address copied` : `copy ${name} address`} title={copied ? 'copied' : 'copy address'}>
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          <a href={href} target="_blank" rel="noopener" className={`${s.iconBtn} ${s.extLink}`} aria-label={`${name} on Etherscan`} title="view on Etherscan">↗</a>
        </span>
        <span role="status" className="sr-only">{copied ? 'address copied' : ''}</span>
      </div>
    </div>
  );
}
