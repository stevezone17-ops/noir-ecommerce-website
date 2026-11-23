import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
  poweredByHeader: false,
};
export default config;
