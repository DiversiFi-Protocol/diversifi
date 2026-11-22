import type { Metadata } from 'next';
import Link from 'next/link';
import { Crops, Wordmark } from '@/components/brand';
import { APP_URL, COINGECKO_URL, DOCS_URL, TERMS_URL, UNISWAP_URL, WHITEPAPER_URL, X_URL } from '@/lib/coins';
import { FaqJsonLd, FaqList } from '@/components/FaqList';
import { pageSeed } from '@/lib/reserve-seed';
import { og } from '@/lib/site';
import shell from '../terms/terms.module.css';
import s from './faq.module.css';

const DESC = 'Answers about DFiUSD (Diversified USD): what backs it, how it differs from USDC, what happens if a stablecoin depegs, fees, redemption, audits and risks.';

export const metadata: Metadata = {
  title: 'DFiUSD FAQ: backing, fees, redemption and risks',
  description: DESC,
  alternates: { canonical: '/faq' },
  openGraph: og('/faq', 'DFiUSD FAQ · DiversiFi', DESC),
};

export default async function Faq() {
  const seed = await pageSeed();

  return (
    <>
      <FaqJsonLd seed={seed} />
      <nav aria-label="primary" className={shell.nav}>
        <div className={`wrap ${shell.navIn}`}>
          <Link href="/" aria-label="DiversiFi home" className={shell.logo}><Wordmark /></Link>
          <a href={APP_URL} className="btn btn-primary btn-nav">open app</a>
        </div>
      </nav>

      <main>
        <header className={`gridbg ${shell.head}`}>
          <Crops />
          <div className={`wrap ${shell.headIn}`}>
            <div className="rail"><span>FAQ</span><span>BACKING · FEES · REDEMPTION · RISK</span></div>
            <h1 className="h1">questions about DFiUSD.</h1>
          </div>
        </header>

        <div className={`wrap ${s.body}`}>
          <FaqList seed={seed} />
          <p className={s.more}>More detail on the mechanics and risks is in the <a href={DOCS_URL} target="_blank" rel="noopener">documentation ↗</a>.</p>
        </div>

        <footer className={shell.foot}>
          <div className={`wrap ${shell.footIn}`}>
            <nav aria-label="resources" className={shell.links}>
              <Link href="/">home</Link>
              <a href={DOCS_URL} target="_blank" rel="noopener">docs ↗</a>
              <a href={WHITEPAPER_URL} target="_blank" rel="noopener">whitepaper ↗</a>
              <a href={X_URL} target="_blank" rel="noopener">X ↗</a>
              <a href={COINGECKO_URL} target="_blank" rel="noopener">coingecko ↗</a>
              <a href={UNISWAP_URL} target="_blank" rel="noopener">uniswap ↗</a>
            </nav>
            <div className={shell.sign}>
              <Wordmark size={21} mark={24} />
              <span className="mono dim" style={{ fontSize: 13 }}>© 2026 DiversiFi</span>
              <nav aria-label="legal" className={shell.legal}>
                <Link href="/faq">faq</Link>
                <Link href={TERMS_URL}>terms of service</Link>
              </nav>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
