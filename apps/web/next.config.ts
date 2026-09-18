import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  transpilePackages: ['@ludo/shared'],
  // All metadata here is static (no async generateMetadata), so there's no meaningful TTFB cost
  // to resolving it before the first byte - matching every user agent keeps title/description/OG
  // tags in the initial HTML for every crawler and browser instead of streaming them in after
  // hydration, which some crawlers and audit tools (e.g. Lighthouse) never wait for.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
