import { AI_BOTS, isProdHost, SITE_URL } from './site';

/** robots.txt for the requesting host: preview hosts disallow everything. The Worker serves it (worker/index.ts). */
export function robotsTxt(host: string | null): string {
  if (!isProdHost(host)) return `# Preview host. The live site is ${SITE_URL}\nUser-agent: *\nDisallow: /\n`;

  const rules = 'Allow: /\nDisallow: /api/\n';
  return [
    '# DiversiFi · DFiUSD',
    '# Content signals (https://contentsignals.org): search indexing, AI answers and AI training are all permitted.',
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
    rules,
    ...AI_BOTS.map(bot => `User-agent: ${bot}\n${rules}`),
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}
