'use client';

import { useState } from 'react';
import { faqs } from '@/lib/faq';
import { FALLBACK_READING } from '@/lib/reserve';
import { decodeSeed } from '@/lib/reserve-seed';
import { FAQ_LD_TOKEN, FAQ_SLOTS, faqLd } from '@/lib/reserve-view';
import s from '@/app/faq/faq.module.css';

/*
 * The FAQ answers and their FAQPage JSON-LD. Two answers quote the chain (the target split and the fees), so they
 * render from the page's reserve seed like the home page does; the static build renders their tokens instead.
 */
function useFaqs(seed: string) {
  const [first] = useState(() => decodeSeed(seed));
  return { first, items: first ? faqs(first.reading, first.ok) : faqs(FALLBACK_READING, true, FAQ_SLOTS) };
}

export function FaqJsonLd({ seed }: { seed: string }) {
  const { first, items } = useFaqs(seed);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: first ? faqLd(items) : FAQ_LD_TOKEN }} />;
}

export function FaqList({ seed }: { seed: string }) {
  const { items } = useFaqs(seed);
  return (
    <>
      {items.map((f, n) => (
        <section key={f.q} className={s.item} aria-labelledby={`q${n}`}>
          {/* The number sits outside the heading, so search engines read the question alone. */}
          <div className={s.q}><span className={s.num} aria-hidden="true">{String(n + 1).padStart(2, '0')}</span><h2 id={`q${n}`} className={s.qText}>{f.q}</h2></div>
          <p className={s.a}>
            {f.a.map((seg, i) => typeof seg === 'string' ? seg : (
              <a key={i} href={seg.href} {...(seg.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>{seg.text}</a>
            ))}
          </p>
        </section>
      ))}
    </>
  );
}
