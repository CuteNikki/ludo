/**
 * Operator details for the imprint. They come from build-time environment variables rather than
 * being committed, since this repository is public. `NEXT_PUBLIC_*` values are inlined by Next.js,
 * so each one must be referenced literally (no dynamic `process.env[key]` lookups).
 */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const operator = {
  name: clean(process.env.NEXT_PUBLIC_LEGAL_NAME),
  /** Address lines separated by `;`, e.g. `Example Street 1; 12345 Example City; Germany`. */
  addressLines:
    clean(process.env.NEXT_PUBLIC_LEGAL_ADDRESS)
      ?.split(';')
      .map((line) => line.trim())
      .filter(Boolean) ?? [],
  email: clean(process.env.NEXT_PUBLIC_LEGAL_EMAIL),
  phone: clean(process.env.NEXT_PUBLIC_LEGAL_PHONE),
};

export const isOperatorConfigured = Boolean(operator.name && operator.addressLines.length > 0 && operator.email);

export const repositoryUrl = 'https://github.com/CuteNikki/ludo';
