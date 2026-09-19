import { ImageResponse } from 'next/og';

import { LogoMarkSvg, brand } from '@/lib/brand';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The home-screen icon on iOS. It has to fill the whole square (the system rounds the corners), so the mark sits on paper. */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: brand.paper }}>
      <LogoMarkSvg size={128} />
    </div>,
    { ...size },
  );
}
