import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { NextConfig } from 'next';

/**
 * The operator details for the imprint live in the repo-root `.env`, shared with Docker Compose
 * (`LEGAL_NAME`, ...). Next only loads `.env` files from this app's directory and only exposes
 * `NEXT_PUBLIC_*` names to the browser, so pick them up here and map them to the public names.
 * Values already set in the environment (e.g. Docker build args) always win.
 */
function readRootEnv(): Record<string, string> {
  const file = path.resolve(process.cwd(), '../../.env');
  if (!existsSync(file)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || match[1]!.startsWith('#')) continue;
    values[match[1]!] = match[2]!.replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

const rootEnv = readRootEnv();
const legal = (field: 'NAME' | 'ADDRESS' | 'EMAIL' | 'PHONE') =>
  process.env[`NEXT_PUBLIC_LEGAL_${field}`] || process.env[`LEGAL_${field}`] || rootEnv[`NEXT_PUBLIC_LEGAL_${field}`] || rootEnv[`LEGAL_${field}`] || '';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  transpilePackages: ['@ludo/shared'],
  env: {
    NEXT_PUBLIC_LEGAL_NAME: legal('NAME'),
    NEXT_PUBLIC_LEGAL_ADDRESS: legal('ADDRESS'),
    NEXT_PUBLIC_LEGAL_EMAIL: legal('EMAIL'),
    NEXT_PUBLIC_LEGAL_PHONE: legal('PHONE'),
  },
  // All metadata here is static (no async generateMetadata), so there's no meaningful TTFB cost
  // to resolving it before the first byte - matching every user agent keeps title/description/OG
  // tags in the initial HTML for every crawler and browser instead of streaming them in after
  // hydration, which some crawlers and audit tools (e.g. Lighthouse) never wait for.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
