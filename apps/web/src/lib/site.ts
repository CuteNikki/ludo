import type { Metadata } from 'next';

/** Site-wide facts used by the metadata, the web manifest, robots.txt and the sitemap. */

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const siteName = 'Ludo';
export const siteTitle = 'Ludo · Real-time multiplayer board game';
export const siteDescription =
  'Play Ludo ("Mensch ärgere Dich nicht") online in real time. Open a room, share the link, and start playing - no download or sign-up required.';

/** The paper and night colors of the theme (globals.css), for the browser chrome and the installed app. */
export const themeColors = { light: '#fdf2d8', dark: '#191430' } as const;

/** The pages worth listing for search engines. Rooms are private, throwaway games and stay out. */
export const publicPaths = ['/', '/discover', '/rules', '/privacy', '/terms', '/imprint'] as const;

/**
 * Metadata for one page. A page's `openGraph` and `twitter` replace the site-wide ones rather than merging
 * with them, so a shared link would keep the home page's title unless each page states its own.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const shareTitle = `${title} · ${siteName}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: shareTitle, description, url: path, siteName, type: 'website', locale: 'en_US', alternateLocale: ['de_DE'] },
    twitter: { card: 'summary_large_image', title: shareTitle, description },
  };
}
