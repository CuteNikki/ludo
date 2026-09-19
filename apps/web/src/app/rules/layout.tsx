import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Rules',
  description: 'How Ludo (Mensch ärgere Dich nicht) is played, and the house rules this online version uses.',
  path: '/rules',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
