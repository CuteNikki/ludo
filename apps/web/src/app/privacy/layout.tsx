import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'How Ludo handles your data: no accounts, no ads and no tracking.',
  path: '/privacy',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
