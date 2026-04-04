import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins: [
    'https://red.crevn.xyz',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3003',
  ], // Add your dev origin here
  reactStrictMode: false,
  // Keep IDKit on disk: bundling breaks WASM load (import.meta.url + URL vs Node's fs).
  serverExternalPackages: ['@worldcoin/idkit', '@worldcoin/idkit-core'],
  // @worldcoin/idkit-core ships server-only WASM init that dynamic-imports fs/promises;
  // the browser path never uses it, but webpack still resolves the import unless stubbed.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
      };
    }
    return config;
  },
};

export default nextConfig;
