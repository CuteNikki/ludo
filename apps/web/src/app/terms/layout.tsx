import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description: 'The terms for using Ludo.',
  path: '/terms',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
