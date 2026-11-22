import type { NextConfig } from 'next';

// A static export (out/): the hand-written Worker (worker/index.ts) serves it through Workers Static Assets and adds
// the live reserve figures, the security headers and the per-host files (robots.txt, llms.txt).
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
