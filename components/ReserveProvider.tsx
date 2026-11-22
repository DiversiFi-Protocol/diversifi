'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { FALLBACK_READING, POLL_MS, readReserve, STALE_MS, type ReserveMode, type ReserveReading } from '@/lib/reserve';
import { decodeSeed } from '@/lib/reserve-seed';

type Ctx = { reading: ReserveReading; mode: ReserveMode; refresh: () => void; ageMin: number; template: boolean };
const ReserveCtx = createContext<Ctx | null>(null);

export function useReserve() {
  const v = useContext(ReserveCtx);
  if (!v) throw new Error('useReserve outside ReserveProvider');
  return v;
}

/**
 * Holds the reserve reading. The page first renders with `seed`: the reading the Worker put into the HTML, so
 * crawlers see real figures and hydration matches; in the static build it is the placeholder, and the components
 * render their tokens (`template`). The client re-reads on mount, every 60s and on window focus.
 */
export function ReserveProvider({ seed, children }: { seed: string; children: React.ReactNode }) {
  const [first] = useState(() => decodeSeed(seed));
  const [template, setTemplate] = useState(first === null);
  const [reading, setReading] = useState(first?.reading ?? FALLBACK_READING);
  const [failed, setFailed] = useState(first ? !first.ok : false);
  const [now, setNow] = useState(reading.readAt);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await readReserve();
      setReading(r);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setTemplate(false);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(poll); clearInterval(tick); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const age = Math.max(0, now - reading.readAt);
  const mode: ReserveMode = failed ? 'unavailable' : age > STALE_MS ? 'stale' : 'live';

  return <ReserveCtx.Provider value={{ reading, mode, refresh, ageMin: Math.round(age / 60_000), template }}>{children}</ReserveCtx.Provider>;
}
