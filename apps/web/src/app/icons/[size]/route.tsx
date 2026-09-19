import { ImageResponse } from 'next/og';

import { LogoMarkSvg, brand } from '@/lib/brand';

/** The PNG icons the web manifest asks for, so the site can be installed from a phone or a desktop browser. */
const sizes = [192, 512];

export const dynamicParams = false;

export function generateStaticParams() {
  return sizes.map((size) => ({ size: String(size) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const pixels = Number(size);
  // The mark takes 70% of the icon, which keeps it inside the safe area if a platform crops it to a circle.
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper }}>
      <LogoMarkSvg size={Math.round(pixels * 0.7)} />
    </div>,
    { width: pixels, height: pixels },
  );
}
