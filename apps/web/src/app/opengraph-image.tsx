import { ImageResponse } from 'next/og';

import { BoardSvg, LogoMarkSvg, brand, loadDisplayFont } from '@/lib/brand';

export const alt = 'Ludo: roll, move, and don\'t get mad. A real-time multiplayer board game.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const letters = [
  { letter: 'L', color: brand.red },
  { letter: 'u', color: brand.blue },
  { letter: 'd', color: brand.green },
  { letter: 'o', color: brand.yellow },
];

/** The picture shown when a link to the site is shared: the wordmark, the tagline and a board. */
export default async function OpengraphImage() {
  const font = await loadDisplayFont();
  // Without the display font (a build with no network) fall back to a heavy system face.
  const fontFamily = font ? 'Lilita One' : 'sans-serif';
  const fontWeight = font ? 400 : 900;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 72px',
          backgroundColor: brand.paper,
          backgroundImage: 'radial-gradient(rgba(30, 21, 51, 0.14) 3px, transparent 3px)',
          backgroundSize: '44px 44px',
          color: brand.ink,
          fontFamily,
          fontWeight,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: 620 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <LogoMarkSvg size={104} />
            <div style={{ display: 'flex', marginLeft: 26, fontSize: 112, lineHeight: 1, letterSpacing: 3 }}>
              {letters.map(({ letter, color }) => (
                <span key={letter} style={{ color, WebkitTextStroke: '9px #1e1533', paintOrder: 'stroke fill' }}>
                  {letter}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 44, fontSize: 88, lineHeight: 1 }}>Roll. Move.</div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 18,
              padding: '6px 28px 10px',
              fontSize: 72,
              lineHeight: 1.1,
              color: '#ffffff',
              backgroundColor: brand.red,
              border: '6px solid #1e1533',
              borderRadius: 22,
              boxShadow: '9px 9px 0 #1e1533',
              transform: 'rotate(-2deg)',
            }}
          >
            {"Don't get mad."}
          </div>

          <div style={{ display: 'flex', marginTop: 40, fontSize: 32, lineHeight: 1.35, color: '#4a4063' }}>
            Real-time multiplayer. Open a room, share the link, play.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            padding: 12,
            backgroundColor: brand.red,
            border: '8px solid #1e1533',
            borderRadius: 30,
            boxShadow: '14px 14px 0 #1e1533',
            transform: 'rotate(3deg)',
          }}
        >
          <div style={{ display: 'flex', borderRadius: 14, overflow: 'hidden', border: '5px solid #1e1533' }}>
            <BoardSvg size={380} />
          </div>
        </div>
      </div>
    ),
    { ...size, ...(font ? { fonts: [{ name: 'Lilita One', data: font, weight: 400 as const, style: 'normal' as const }] } : {}) },
  );
}
