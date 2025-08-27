// frontend/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // Absolute path is required; __dirname resolves to the current config folder (frontend)
    root: __dirname,
  },
};

export default nextConfig;
