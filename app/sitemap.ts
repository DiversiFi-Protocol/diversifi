import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Generated once at build time for the static export (out/sitemap.xml).
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/terms`, lastModified: new Date('2025-09-01'), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
