import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    // Rooms are throwaway games between friends, not pages anyone should find through a search.
    rules: { userAgent: '*', allow: '/', disallow: '/room/' },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
