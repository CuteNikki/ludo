/**
 * The brand, drawn for generated images (the social preview, the touch icon, the install icons). These
 * render through Satori, which has no CSS variables, so the theme colors are repeated here as hex.
 */

export const brand = {
  ink: '#1e1533',
  paper: '#fdf2d8',
  red: '#ff5252',
  blue: '#3d7bff',
  green: '#2dbd6e',
  yellow: '#ffc82c',
} as const;

const soft = { red: '#ffc9c4', blue: '#c6d9ff', green: '#c2eed3', yellow: '#ffeaa6' } as const;

/** The four-color board with a die pip in the middle; the same mark as `icon.svg` and the navbar logo. */
export function LogoMarkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 40 40'>
      <rect width='40' height='40' rx='9' fill={brand.ink} />
      <rect x='3' y='3' width='15' height='15' rx='4' fill={brand.red} />
      <rect x='22' y='3' width='15' height='15' rx='4' fill={brand.blue} />
      <rect x='3' y='22' width='15' height='15' rx='4' fill={brand.yellow} />
      <rect x='22' y='22' width='15' height='15' rx='4' fill={brand.green} />
      <circle cx='20' cy='20' r='7' fill='#ffffff' stroke={brand.ink} strokeWidth='3' />
      <circle cx='20' cy='20' r='2.2' fill={brand.ink} />
    </svg>
  );
}

const yards = [
  { row: 0, col: 0, color: 'red' },
  { row: 0, col: 7, color: 'blue' },
  { row: 7, col: 0, color: 'yellow' },
  { row: 7, col: 7, color: 'green' },
] as const;

function cellFill(row: number, col: number): string {
  if (row === 5 && col >= 1 && col <= 4) return brand.red;
  if (col === 5 && row >= 1 && row <= 4) return brand.blue;
  if (col === 5 && row >= 6 && row <= 9) return brand.yellow;
  if (row === 5 && col >= 6 && col <= 9) return brand.green;
  if (row === 5 && col === 5) return brand.ink;
  const yard = yards.find((entry) => row >= entry.row && row < entry.row + 4 && col >= entry.col && col < entry.col + 4);
  if (yard) return soft[yard.color];
  return '#ffffff';
}

/** A small Ludo board: four yards with their pieces, the cross of paths and the home lanes. */
export function BoardSvg({ size }: { size: number }) {
  const cell = size / 11;
  const cells = Array.from({ length: 121 }, (_, index) => ({ row: Math.floor(index / 11), col: index % 11 }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill={brand.ink} />
      {cells.map(({ row, col }) => (
        <rect key={`${row}-${col}`} x={col * cell + 1} y={row * cell + 1} width={cell - 2} height={cell - 2} rx={3} fill={cellFill(row, col)} />
      ))}
      {yards.flatMap(({ row, col, color }) =>
        [
          [1, 1],
          [1, 2],
          [2, 1],
          [2, 2],
        ].map(([dr, dc]) => (
          <circle key={`${color}-${dr}-${dc}`} cx={(col + dc! + 0.5) * cell} cy={(row + dr! + 0.5) * cell} r={cell * 0.36} fill={brand[color]} stroke={brand.ink} strokeWidth={3} />
        )),
      )}
    </svg>
  );
}

let displayFont: Promise<ArrayBuffer | null> | undefined;

/**
 * Lilita One, the display face of the site, fetched once for the images that render text. The images are
 * generated when the site is built, so this runs then and never in a visitor's browser. If the font can't
 * be fetched (say, a build without network) the images fall back to a plain bold face.
 */
export function loadDisplayFont(): Promise<ArrayBuffer | null> {
  displayFont ??= (async () => {
    try {
      const css = await (await fetch('https://fonts.googleapis.com/css2?family=Lilita+One')).text();
      const url = /src:\s*url\((https:[^)]+)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
      return url ? await (await fetch(url)).arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  return displayFont;
}
