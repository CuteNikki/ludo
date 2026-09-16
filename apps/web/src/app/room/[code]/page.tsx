import { RoomClient } from './room-client';

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient requestedCode={code.toUpperCase()} />;
}
