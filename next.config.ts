import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '172.17.9.26',
      },
    ],
    // Allow local /uploads/ paths without optimization issues
    unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
