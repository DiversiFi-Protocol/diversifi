'use client';

import { useEffect, useRef, useState } from 'react';
import { COINS, coinUrl } from '@/lib/coins';
import { FALLBACK_READING } from '@/lib/reserve';
import { BAR_FIRST_STATE, barView, tokenize, type BarProps } from '@/lib/reserve-view';
import { useReserve } from './ReserveProvider';
import s from './ReserveBar.module.css';

type Props = Partial<BarProps> & {
  /** Hold the settle animation until true (the hero waits for its ring intro). */
  start?: boolean;
};

const BAR_H = { lg: 72, md: 40, sm: 12 };

/**
 * Default readout shows whether the basket is on target (`status`) and how many issuers and coins back it.
 * Every figure comes from barView; the static build renders it as tokens, which only matches the Worker's first
 * frame for the hero's props (HERO_BAR), the only bar on the site.
 */
export function ReserveBar({ size = 'md', readout = false, showTotal = true, start = true, status = false }: Props) {
  const { reading, mode, template } = useReserve();
  const loading = mode === 'loading';
  const root = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(BAR_FIRST_STATE.width);
  const [p, setP] = useState(BAR_FIRST_STATE.progress);
  const [shown, setShown] = useState(BAR_FIRST_STATE.shown);
  const [settled, setSettled] = useState(false);
  const [hover, setHover] = useState(BAR_FIRST_STATE.hover);
  const touch = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Settle once on entering the viewport: scaleX 0→1 (overshoot), shares count up (ease-out quart).
  const started = useRef(false);
  const timers = useRef({ raf: 0, done: 0 });
  useEffect(() => () => { cancelAnimationFrame(timers.current.raf); clearTimeout(timers.current.done); }, []);
  useEffect(() => {
    if (started.current || loading || !start) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = () => {
      started.current = true;
      setShown(true);
      if (reduce) { setP(1); setSettled(true); return; }
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 1600);
        setP(1 - Math.pow(1 - k, 4));
        if (k < 1) timers.current.raf = requestAnimationFrame(step);
      };
      timers.current.raf = requestAnimationFrame(step);
      timers.current.done = window.setTimeout(() => setSettled(true), 2600);
    };
    const el = root.current!;
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [loading, start]);

  const props: BarProps = { size, readout, showTotal, status };
  const view = template
    ? tokenize(barView(FALLBACK_READING, 'live', props, BAR_FIRST_STATE), 'bar')
    : barView(reading, mode, props, { width: w, progress: p, shown, hover });
  const h = hover >= 0 && !loading ? hover : -1;
  const readoutSwatch = h >= 0;
  // The template carries both first-render modes; the Worker keeps the tagged element only when the reserve is live.
  const showReadout = readout && (template || mode !== 'unavailable');

  const onSegClick = (i: number) => (e: React.MouseEvent) => {
    // Touch: first tap shows the readout, second follows the link.
    if (touch.current && hover !== i) { e.preventDefault(); setHover(i); }
  };

  return (
    <div
      ref={root}
      className={s.root}
      style={{ opacity: view.rootOpacity }}
      onMouseLeave={() => setHover(-1)}
      onPointerDown={e => { touch.current = e.pointerType === 'touch'; }}
    >
      {size !== 'sm' && (
        <div aria-hidden="true" className="ruler" style={{ marginBottom: 10 }}>{Array.from({ length: 21 }, (_, i) => <i key={i} />)}</div>
      )}
      <div className={s.bar} style={{ height: BAR_H[size], transform: shown || loading ? 'scaleX(1)' : 'scaleX(0)' }}>
        {COINS.map((c, i) => (
          <a
            key={c.t}
            href={coinUrl(c)}
            target="_blank"
            rel="noopener"
            aria-label={view.coins[i].segmentLabel}
            onMouseEnter={() => !loading && setHover(i)}
            onFocus={() => !loading && setHover(i)}
            onBlur={() => setHover(-1)}
            onClick={onSegClick(i)}
            className={s.seg}
            style={{ flex: view.coins[i].flex, background: loading ? 'var(--line)' : c.color, opacity: h >= 0 && h !== i ? 0.28 : 1 }}
          />
        ))}
      </div>
      {size !== 'sm' && (
        <div className={s.labels} aria-hidden="true">
          {COINS.map((c, i) => (
            <div
              key={c.t}
              onMouseEnter={() => !loading && setHover(i)}
              className={s.col}
              style={{
                flex: view.coins[i].flex,
                opacity: !shown && !loading ? 0 : h >= 0 && h !== i ? 0.35 : 1,
                transitionDelay: settled ? '0ms' : 500 + i * 110 + 'ms',
              }}
            >
              <i className={s.stem} style={{ height: view.coins[i].stemHeight }} />
              <div className={s.lab} style={{ alignSelf: view.coins[i].labelAlign }}>
                <span style={{ fontSize: view.tickerSize }} className={s.ticker}>{c.t}</span>
                <span style={{ fontSize: view.shareSize }} className={loading ? `${s.share} skel` : s.share}>{view.coins[i].share}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {showReadout && (
        <div className={s.readout} aria-live="polite" data-rm="live">
          <span className={s.rdLabel}>{readoutSwatch && <i className="sw" style={{ background: view.readout.color }} />}{view.readout.label}</span>
          <span className={s.rdValue}>{view.readout.value}</span>
          <span className={s.rdScope}>{view.readout.scope}</span>
        </div>
      )}
    </div>
  );
}
