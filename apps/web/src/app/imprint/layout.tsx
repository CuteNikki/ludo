import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Imprint',
  description: 'Who operates Ludo, and how to reach them.',
  path: '/imprint',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
