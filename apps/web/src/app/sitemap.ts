import type { MetadataRoute } from 'next';

import { publicPaths, siteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/discover' || path === '/rules' ? 0.7 : 0.3,
  }));
}
