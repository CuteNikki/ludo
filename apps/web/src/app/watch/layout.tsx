import type { Metadata } from 'next';

// Like rooms, a game being watched is a throwaway: nothing in it belongs in a search index.
export const metadata: Metadata = {
  title: 'Watch a game',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
