import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove deprecated appDir - it's default in Next.js 13+
  
  // PWA Configuration
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ]
  },
  
  // Handle favicon redirect (optional)
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icons/icon-192x192.png',
      },
    ]
  },
};

export default nextConfig;
