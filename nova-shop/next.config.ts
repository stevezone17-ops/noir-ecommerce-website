import type { NextConfig } from 'next';

const config: NextConfig = {
  async rewrites() {
    return [{ source: '/', destination: '/index.html' }];
  },
  poweredByHeader: false,
};
export default config;
