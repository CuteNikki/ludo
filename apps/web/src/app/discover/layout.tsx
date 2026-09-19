import type { Metadata } from 'next';

import { pageMetadata } from '@/lib/site';

export const metadata: Metadata = pageMetadata({
  title: 'Public rooms',
  description: 'Browse open Ludo rooms and jump into a game with people online.',
  path: '/discover',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
