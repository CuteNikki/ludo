import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fdf2d8',
          backgroundImage: 'linear-gradient(rgba(30,21,51,.1) 2px, transparent 2px), linear-gradient(90deg, rgba(30,21,51,.1) 2px, transparent 2px)',
          backgroundSize: '48px 48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 168,
            height: 168,
            borderRadius: 28,
            backgroundColor: '#1e1533',
            marginBottom: 40,
          }}
        >
          {/* lucide "dices" glyph, redrawn as filled shapes since Satori doesn't support stroked paths */}
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="10" width="12" height="12" rx="2" fill="#fdf2d8" />
            <circle cx="6" cy="18" r="1.4" fill="#1e1533" />
            <circle cx="10" cy="14" r="1.4" fill="#1e1533" />
            <path
              d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6l7.92 8Z"
              fill="#fdf2d8"
            />
            <circle cx="15" cy="6" r="1.4" fill="#1e1533" />
            <circle cx="18" cy="9" r="1.4" fill="#1e1533" />
          </svg>
        </div>
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 900, color: '#1e1533', letterSpacing: -2 }}>Ludo</div>
        <div style={{ display: 'flex', marginTop: 16, fontSize: 34, fontWeight: 700, color: '#5b4f78' }}>
          Real-time multiplayer · open a room, share the link, play
        </div>
      </div>
    ),
    { ...size },
  );
}
