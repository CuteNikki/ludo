import type { Metadata } from 'next';

import { siteName } from '@/lib/site';

const description = 'You have been invited to a game of Ludo. Open the link to join the room: no download or sign-up needed.';

// Rooms are throwaway games between friends: nothing in them belongs in a search index. (The share preview
// still matters, since a room link is the invitation people send to each other.)
export const metadata: Metadata = {
  title: 'Room',
  description,
  robots: { index: false, follow: false },
  openGraph: { title: `Join my game of ${siteName}`, description, siteName, type: 'website' },
  twitter: { card: 'summary_large_image', title: `Join my game of ${siteName}`, description },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
