import { APP_URL, AUDIT_URL, COINS, rmUrl } from './coins';
import type { ReserveReading } from './reserve';

// One source for the /faq page, its FAQPage JSON-LD and llms.txt, so they never drift apart.
// Answers are segments: plain text, or a link. The JSON-LD uses the plain-text join.
export type Seg = string | { text: string; href: string };
export type Faq = { q: string; a: Seg[] };

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const pct = (f: number) => `${(f * 100).toFixed(2).replace(/\.?0+$/, '')}%`;

/** "30% USDC, 15% each DAI and USDS, and 10% each for USDT, GHO, FDUSD and frxUSD", from the live targets. */
function split(r: ReserveReading) {
  const groups = new Map<number, string[]>();
  r.coins.forEach(c => groups.set(c.target, [...(groups.get(c.target) ?? []), c.t]));
  const parts = [...groups].sort((a, b) => b[0] - a[0]).map(([t, coins], i, all) => {
    const p = `${+t.toFixed(1)}%`;
    if (coins.length === 1) return `${p} ${coins[0]}`;
    return i === all.length - 1 && all.length > 1 ? `${p} each for ${list(coins)}` : `${p} each ${list(coins)}`;
  });
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

// Questions are phrased the way people search ("what is …", "is … audited", "how do I …"), so each one
// can match a query on its own. Keep answers to facts the site already states.
/** The two answer fragments read from the chain. */
export function faqSlots(r: ReserveReading, live: boolean) {
  return { split: split(r), fee: live ? ` It is currently ${pct(r.mintFee)} to mint and ${pct(r.burnFee)} to redeem.` : '' };
}

/** `slots` replaces the live fragments, for the build-time template (see lib/reserve-view.ts). */
export function faqs(r: ReserveReading, live: boolean, slots = faqSlots(r, live)): Faq[] {
  const { fee } = slots;
  return [
    {
      q: 'what is DFiUSD?',
      a: [`DFiUSD (listed on exchanges and price sites as Diversified USD, DFIUSD) is a USD stablecoin on Ethereum, issued by DiversiFi. Each DFiUSD is backed 1:1 by a basket of USD stablecoins (currently ${list(COINS.map(c => c.t))}) held in the ReserveManagerV1 smart contract, so no single issuer backs the whole token.`],
    },
    {
      q: 'what is a diversified stablecoin?',
      a: ['A stablecoin backed by several other stablecoins instead of one issuer’s reserves. If one issuer fails or depegs, only its share of the backing is affected. Today 61% of all stablecoin supply sits with a single issuer.'],
    },
    {
      q: 'how is DFiUSD different from USDC or USDT?',
      a: ['USDC and USDT are each backed by one company’s reserves. DFiUSD is backed by a basket of stablecoins from multiple issuers, USDC and USDT among them, so a problem at one issuer only touches its share of the backing.'],
    },
    {
      q: 'what is DFiUSD backed by?',
      a: [`A basket of USD stablecoins from several issuers, held on Ethereum. The current target split is ${slots.split}. Governance can add or remove coins and change the split; every balance is readable on-chain.`],
    },
    {
      q: 'what happens if a stablecoin in the basket depegs?',
      a: ['The loss stays in that coin’s slice. Its target can be set to 0%, every swap then moves the reserve away from it, and minting can be paused while it is still held. Swap fees also fill an insurance fund that can buy a failing coin out of the reserve.'],
    },
    {
      q: 'how can I verify DFiUSD’s reserves?',
      a: ['Open ', { text: 'ReserveManagerV1 on Etherscan', href: rmUrl }, ' and read each coin’s balance, or use the ', { text: 'reserve table', href: '/#reserve' }, ' on the home page, where every figure links to the balance it was read from.'],
    },
    {
      q: 'is DFiUSD audited?',
      a: ['Yes. The DFiUSD token and the ReserveManagerV1 contract were audited by Nethermind (', { text: 'read the report', href: AUDIT_URL }, ') and CertiK, and their source code is verified on Etherscan.'],
    },
    {
      q: 'what are DFiUSD’s fees?',
      a: [`Minting and redeeming can carry a fee, set in the contract.${fee} The app reads the fee from the chain and shows exactly what you will receive before you confirm.`],
    },
    {
      q: 'how do I get DFiUSD?',
      a: ['Swap USDC, USDT, DAI or any other basket coin for DFiUSD in the ', { text: 'DiversiFi app', href: APP_URL }, ', which routes through the DFiUSD pools on Uniswap. You can also mint it with the full basket.'],
    },
    {
      q: 'how do I redeem DFiUSD?',
      a: ['Connect a wallet in the ', { text: 'DiversiFi app', href: APP_URL }, ' and burn DFiUSD. You receive the reserve’s current mix of every coin in the basket, less any redeem fee, or swap it for a single coin.'],
    },
    {
      q: 'is DFiUSD a rebasing token?',
      a: ['Technically, yes: the contract can adjust every balance by the same factor, for example when the reserve moves to a new contract. The rebase rate is currently zero, so balances do not change on their own.'],
    },
    {
      q: 'can a DFiUSD wallet be frozen?',
      a: ['Yes. The DFiUSD contract can freeze an address, for example to comply with sanctions. A frozen address cannot transfer, mint or redeem, and the app checks for this before every transaction.'],
    },
    {
      q: 'what are the risks of holding DFiUSD?',
      a: ['Diversification reduces single-issuer exposure; it does not eliminate risk. DFiUSD carries smart-contract risk and the risk of each coin in the basket. It is not a bank deposit and is not insured.'],
    },
  ];
}

export const faqText = (a: Seg[]) => a.map(s => (typeof s === 'string' ? s : s.text)).join('');
