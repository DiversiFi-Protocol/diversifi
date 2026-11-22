import Link from 'next/link';
import { Crops, DfiChip, Mark, MiniBar, Ruler, Wordmark } from '@/components/brand';
import { IssuerExplainer, MarketMorph, MintDots, ReservePanel, ReserveSection, ContractRow } from '@/components/home';
import { ReserveProvider } from '@/components/ReserveProvider';
import { APP_URL, AUDIT_URL, COINGECKO_URL, COINS, CONTACT_MAIL, DEPLOY_TX, DOCS_URL, ETHERSCAN, RM_ADDR, rmUrl, TERMS_URL, TOKEN_ADDR, tokenUrl, UNISWAP_URL, WHITEPAPER_URL, X_URL } from '@/lib/coins';
import { SITE_DESC, SITE_URL } from '@/lib/site';
import { FALLBACK_READING, readReserve } from '@/lib/reserve';
import s from './home.module.css';

// Static pre-render, re-read from chain at most once a minute (ISR) so crawlers see current figures.
export const revalidate = 60;

export default async function Home() {
  let initial = FALLBACK_READING;
  let ok = true;
  try { initial = await readReserve(); } catch { ok = false; }


  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    '@id': `${SITE_URL}/#dfiusd`,
    name: 'DFiUSD',
    alternateName: ['Diversified USD', 'DFIUSD'],
    url: SITE_URL,
    description: SITE_DESC,
    category: 'Stablecoin',
    provider: { '@id': `${SITE_URL}/#org` },
    identifier: TOKEN_ADDR,
    // Listings that already rank for the name, so search engines connect them to this site.
    sameAs: [tokenUrl, 'https://www.coingecko.com/en/coins/diversified-usd', `https://app.uniswap.org/explore/tokens/ethereum/${TOKEN_ADDR.toLowerCase()}`],
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Network', value: 'Ethereum mainnet' },
      { '@type': 'PropertyValue', name: 'Token contract', value: TOKEN_ADDR },
      { '@type': 'PropertyValue', name: 'Reserve contract', value: RM_ADDR },
      { '@type': 'PropertyValue', name: 'Reserve assets', value: COINS.map(c => c.t).join(', ') },
      { '@type': 'PropertyValue', name: 'Security audit', value: 'Nethermind', url: AUDIT_URL },
    ],
    subjectOf: [
      { '@type': 'DigitalDocument', name: 'DiversiFi whitepaper', url: WHITEPAPER_URL, encodingFormat: 'application/pdf' },
      { '@type': 'DigitalDocument', name: 'Nethermind security audit', url: AUDIT_URL, encodingFormat: 'application/pdf' },
    ],
  };

  return (
    <ReserveProvider initial={initial} initialOk={ok}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <nav aria-label="primary" className={s.nav}>
        <div className={`wrap ${s.navIn}`}>
          <a href="#top" aria-label="DiversiFi home" className={s.logo}><Wordmark /></a>
          <a href={APP_URL} className="btn btn-primary btn-nav">open app</a>
        </div>
      </nav>

      <main>
        {/* 01 HERO */}
        <header id="top" className={`gridbg ${s.hero}`}>
          <Crops />
          <div className={`wrap ${s.heroIn}`}>
            <div className={s.heroL}>
              {/* The small label is the page heading search engines read; the big slogan keeps its look as a styled line. */}
              <h1 className="label">DFiUSD · THE DIVERSIFIED USD STABLECOIN</h1>
              <p className="h1">structured stability.</p>
              <p className="dim pretty" style={{ maxWidth: '34em' }}>Every DFiUSD is backed 1:1 by a basket of diversified USD stablecoins, no single issuer can sink it.</p>
              <div className={s.ctaRow}>
                <a href={APP_URL} className="btn btn-primary">get DFiUSD</a>
                <a href="#reserve" className="btn btn-secondary">check reserves</a>
              </div>
              <div className={s.conc}>
                <div className={s.concStat}>
                  <span className={s.big}>61%</span>
                  <p className="pretty" style={{ fontSize: 16, lineHeight: 1.4 }}>of all stablecoin supply still sits with one issuer. DFiUSD spreads its backing across multiple.</p>
                </div>
                <MarketMorph />
                <a href="https://defillama.com/stablecoins" target="_blank" rel="noopener" className={`${s.source} ${s.sourceLink}`}>SOURCE: DEFILLAMA · NOV 2026 ↗</a>
              </div>
            </div>
            <ReservePanel />
          </div>
        </header>

        {/* 02 PROOF */}
        <section aria-label="proof" className={s.proof}>
          <div className={`wrap ${s.proofGrid}`}>
            <a href={AUDIT_URL} target="_blank" rel="noopener" aria-label="Nethermind security audit report (PDF)" className={s.proofCell}><span className="label">AUDITED BY</span><span>NETHERMIND · CERTIK ↗</span></a>
            <a href={rmUrl} target="_blank" rel="noopener" className={s.proofCell}><span className="label">LIVE SINCE</span><span>SEP 2025</span></a>
            <a href="#reserve" className={s.proofCell}><span className="label">RESERVES</span><span>ON-CHAIN, VIEWABLE ANY TIME</span></a>
          </div>
        </section>

        {/* 03 HOW IT WORKS: no visible headline, intentionally; the H2 is for outline and crawlers. */}
        <section id="how" aria-labelledby="how-h" className={`wrap ${s.how}`}>
          <h2 id="how-h" className="sr-only">how DFiUSD works</h2>
          <div className={s.cards}>
            <article className={s.card}>
              <div className={s.cardHead}><span className={s.num}>01</span><h3 className="h3">mint</h3></div>
              <div aria-hidden="true" className={s.dia}><MintDots /></div>
              <p className="dim pretty">Deposit a basket stablecoin and receive DFiUSD. The deposit enters the reserve at the target split.</p>
            </article>
            <article className={s.card}>
              <div className={s.cardHead}><span className={s.num}>02</span><h3 className="h3">hold</h3></div>
              <div aria-hidden="true" className={s.dia}>
                <div className={s.diaHead}><span className="label-sm">ERC-20 · ETHEREUM MAINNET</span></div>
                <div className={s.diaRow}>
                  <DfiChip />
                  <span className="mono dim">→</span>
                  <div className={s.diaCol}><MiniBar /><span className="label-sm" style={{ letterSpacing: '.02em' }}>BACKED BY THE WHOLE BASKET</span></div>
                </div>
              </div>
              <p className="dim pretty">DFiUSD is a plain ERC-20 on Ethereum. Hold it, send it, or trade it on Uniswap.</p>
            </article>
            <article className={`${s.card} ${s.cardDashed}`}>
              <div className={s.cardHead} style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div className={s.cardHead}><span className={s.num}>03</span><h3 className="h3">stake</h3></div>
                <span className={s.soon}>COMING SOON</span>
              </div>
              <div className={`${s.dia} ${s.diaDashed}`}>
                <div aria-label="DiversiFi Vault" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mark size={20} />
                  <span className="mono" style={{ fontWeight: 500, fontSize: 18, lineHeight: 1, letterSpacing: '-0.03em' }}>diversifi</span>
                  <i aria-hidden="true" style={{ width: 1, height: 20, margin: '0 4px', background: 'var(--strong)' }} />
                  <span className="mono" style={{ fontWeight: 500, fontSize: 13, lineHeight: 1, letterSpacing: '.04em' }}>VAULT</span>
                </div>
                <div aria-hidden="true" className={s.diaRow}>
                  <DfiChip />
                  <span className="mono dim">→</span>
                  <div className={s.diaCol}><span className={s.slots}>{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</span><span className="label-sm" style={{ letterSpacing: '.02em', whiteSpace: 'nowrap' }}>6 STRATEGY VAULTS</span></div>
                </div>
              </div>
              <p className="dim pretty">Stake DFiUSD to earn variable yield across six strategy vaults. Coming soon.</p>
            </article>
          </div>
        </section>

        {/* 04 THE RESERVE */}
        <ReserveSection />

        {/* 05 IF AN ISSUER FAILS */}
        <section id="issuer-fails" aria-label="if an issuer fails" className={s.band}>
          <div className={`wrap ${s.bandIn}`}>
            <div className="rail"><span>05 · IF AN ISSUER FAILS</span></div>
            <div className={s.ifLayout}>
              <div className={s.ifLeft}>
                <h2 className="h2s">one issuer breaks. it only touches its slice.</h2>
                <p className="small dim pretty">Contained, not prevented. Four contract steps.</p>
                <a href={DOCS_URL} target="_blank" rel="noopener" className="btn btn-secondary" style={{ alignSelf: 'flex-start', marginTop: 8 }}>read the docs ↗</a>
              </div>
              <IssuerExplainer />
            </div>
            <div className={s.guards}>
              <div className={s.groupHead}><span>ALWAYS ON · 4 SAFEGUARDS</span></div>
              <div className={s.guardGrid}>
                {GUARDS.map((g, i) => (
                  <div key={i} className={s.guard}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                      <div aria-hidden="true" className={s.mini}>{g.icon}</div>
                      <span className={s.stepNum}>{'ABCD'[i]}</span>
                    </div>
                    <h3 className={s.guardTitle}>{g.title}</h3>
                    <p className={s.stepBody}>{g.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 06 FOR TREASURIES & PROTOCOLS: the buyer DFiUSD fits best. Every claim here is checkable on-chain. */}
        <section id="docs" aria-label="for treasuries and protocols" className={`wrap ${s.section}`}>
          <div className="rail"><span>06 · FOR TREASURIES &amp; PROTOCOLS</span><span>RESERVE · COLLATERAL · LIQUIDITY</span></div>
          <div className={s.intGrid}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 className="h2">the preferred dollar reserve.</h2>
              <p className={s.intLead}><span>Built for DAO treasuries, protocols and funds</span> that hold dollars or use them as collateral. DFiUSD diversifies exposure across multiple issuers, reducing concentration risk and strengthening reserve resilience.</p>
              <ul className={s.uses}>
                {USES.map(u => (
                  <li key={u.title} className={s.use}>
                    <div aria-hidden="true" className={s.useIcon}>{u.icon}</div>
                    <div>
                      <h3 className={s.useTitle}>{u.title}</h3>
                      <p className={s.stepBody}>{u.body}{'link' in u && u.link && <> <a href={u.link.href} className={s.useLink}>{u.link.text}</a></>}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className={s.ints}>
              <ContractRow token name="DFiUSD" meta="ERC-20" address={TOKEN_ADDR} href={tokenUrl} />
              <ContractRow name="ReserveManagerV1" meta="RESERVE" address={RM_ADDR} href={rmUrl} />
              <dl className={s.dl}>
                <div><dt>NETWORK</dt><dd>Ethereum mainnet</dd></div>
                <div><dt>LIVE SINCE</dt><dd>Sep 2025<span className="dim">·</span><a href={`${ETHERSCAN}/tx/${DEPLOY_TX}`} target="_blank" rel="noopener" aria-label="DFiUSD deployment transaction on Etherscan">deployment tx ↗</a></dd></div>
                <div><dt>AUDITS</dt><dd><a href={AUDIT_URL} target="_blank" rel="noopener" aria-label="Nethermind security audit report (PDF)">Nethermind ↗</a><span className="dim">·</span>CertiK</dd></div>
              </dl>
              {/* Sits at the bottom of the details column, level with the end of the left column. */}
              <div className={`${s.ctaRow} ${s.intsCta}`}>
                <a href={`${CONTACT_MAIL}?subject=${encodeURIComponent('DFiUSD for our treasury or protocol')}`} className="btn btn-primary">talk to the team</a>
                <a href={DOCS_URL} target="_blank" rel="noopener" className="btn btn-secondary">read the docs ↗</a>
              </div>
            </div>
          </div>
        </section>

        {/* 07 FINAL CTA */}
        <section aria-label="get started" className={`gridbg ${s.final}`}>
          <Crops />
          <div className={`wrap ${s.finalIn}`}>
            <p className={s.finalLine}>proof, not promises.</p>
            <Ruler ticks={41} />
            <div className={s.finalGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span className="label">ONE TOKEN · A BASKET OF STABLECOINS UNDERNEATH</span>
                <nav aria-label="resources" className={s.resLinks}>
                  <a href={DOCS_URL} target="_blank" rel="noopener">docs ↗</a>
                  <a href={WHITEPAPER_URL} target="_blank" rel="noopener">whitepaper ↗</a>
                  <a href={X_URL} target="_blank" rel="noopener">X ↗</a>
                  <a href={COINGECKO_URL} target="_blank" rel="noopener">coingecko ↗</a>
                  <a href={UNISWAP_URL} target="_blank" rel="noopener">uniswap ↗</a>
                </nav>
                <footer className={s.sign}>
                  <Wordmark size={21} mark={24} />
                  <span className="mono dim" style={{ fontSize: 13 }}>© 2026 DiversiFi</span>
                  <nav aria-label="legal" className={s.legal}>
                    <Link href="/faq">faq</Link>
                    <Link href={TERMS_URL}>terms of service</Link>
                  </nav>
                </footer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span className="label">MINT, SWAP OR REDEEM IN THE APP</span>
                <div className={s.ctaRow}>
                  <a href={APP_URL} className="btn btn-primary">get DFiUSD</a>
                  <a href="#reserve" className="btn btn-secondary">check reserves</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

    </ReserveProvider>
  );
}

/* ---------- section 05 safeguard glyphs (div-built, aria-hidden) ---------- */
const EVEN7 = [1, 1, 1, 1, 1, 1, 1];

const blk = (h: number, bg = 'var(--strong)', extra?: React.CSSProperties) => ({ height: h, background: bg, ...extra });

/* ---------- section 06 use cases: facts a treasury can verify itself, each with a div-built glyph (aria-hidden) ---------- */
const USES = [
  {
    title: 'treasury reserve.',
    body: 'Hold dollars without picking one issuer. Redeem whenever you need them.',
    // the seven basket coins (their reserve-bar colours), held inside one vault
    icon: (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, padding: 4, border: '1.5px solid var(--dim)', borderRadius: 4 }}>
        {COINS.map(c => <i key={c.t} className={s.blk} style={blk(20, c.color, { width: 4 })} />)}
      </div>
    ),
  },
  {
    title: 'collateral and liquidity.',
    body: 'An ERC-20 on mainnet, with Uniswap pools against every basket coin.',
    // the basket coins paired with DFiUSD, like a pool
    icon: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>{COINS.slice(0, 3).map((c, i) => <i key={c.t} className={s.blk} style={blk([16, 26, 20][i], c.color, { width: 6 })} />)}</span>
        <span className="mono dim" style={{ fontSize: 14, lineHeight: 1 }}>⇄</span>
        <i className={s.blk} style={blk(26, 'var(--signal)', { width: 12 })} />
      </div>
    ),
  },
  {
    title: 'built-in safeguards.',
    body: 'A failing coin stays in its slice, growth is capped, and a frozen coin can’t trap the rest.',
    link: { text: 'see how it works ↑', href: '#issuer-fails' },
    // the basket with one coin failed and fenced off, the rest untouched
    icon: (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(i => <i key={i} className={s.blk} style={i === 3 ? blk(20, 'transparent', { width: 5, border: '1.5px dashed var(--crit)' }) : blk(20, 'var(--fg)', { width: 5 })} />)}
      </div>
    ),
  },
];

const GUARDS = [
  {
    title: 'insurance fund.',
    body: 'Swap fees fill a fund that can buy a failing coin out of the reserve.',
    icon: (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        {[0, 1, 2].map(i => <i key={i} className={s.blk} style={blk(24)} />)}
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><i className={s.blk} style={blk(10, 'var(--signal)')} /><i className={s.blk} style={blk(11, 'var(--crit)')} /></span>
        {[0, 1, 2].map(i => <i key={i} className={s.blk} style={blk(24)} />)}
      </div>
    ),
  },
  {
    title: 'capped growth.',
    body: 'Reserves are capped and can only grow at a set rate.',
    icon: (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 3, paddingTop: 8 }}>
        <i style={{ position: 'absolute', top: 0, left: -2, right: -2, borderTop: '1.5px dashed var(--dim)' }} />
        {[10, 16, 22, 28].map(h => <i key={h} className={s.blk} style={blk(h)} />)}
      </div>
    ),
  },
  {
    title: "a frozen coin can't trap the rest.",
    body: 'If one coin can’t move, emergency mode still releases the rest.',
    icon: (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
        {EVEN7.map((_, i) => <i key={i} className={s.blk} style={i === 3 ? blk(24, 'transparent', { border: '1.5px dashed var(--crit)' }) : blk(24, 'var(--fg)')} />)}
      </div>
    ),
  },
  {
    title: 'anyone can rebalance.',
    body: 'A bounty pays anyone who moves the reserve back to target.',
    icon: (
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }}>{[14, 8, 10, 12].map((w, i) => <i key={i} style={{ display: 'block', width: w, height: 8, borderRadius: 1, background: 'var(--strong)' }} />)}</div>
        <span className="mono dim" style={{ fontSize: 10 }}>NOW</span>
        <div style={{ display: 'flex', gap: 2 }}>{[0, 1, 2, 3].map(i => <i key={i} style={{ display: 'block', width: 11, height: 8, borderRadius: 1, background: 'var(--signal)' }} />)}</div>
        <span className="mono dim" style={{ fontSize: 10 }}>TARGET</span>
      </div>
    ),
  },
];
