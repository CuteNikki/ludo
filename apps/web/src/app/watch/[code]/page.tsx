import { SpectatorClient } from './spectator-client';

export default async function WatchPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SpectatorClient requestedCode={code.toUpperCase()} />;
}
