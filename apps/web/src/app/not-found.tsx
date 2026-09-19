import type { Metadata } from 'next';

import { NotFoundContent } from '@/components/not-found-content';

// A page that doesn't exist has no business in a search index.
export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundContent />;
}
