import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    mcpServer: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.mairenawiki.es',
        pathname: '/wiki/images/**',
      },
    ],
  },
}

export default nextConfig
