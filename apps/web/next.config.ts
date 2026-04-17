import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/api/:path*`,
      },
      {
        source: '/campaigns/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/campaigns/:path*`,
      },
    ]
  },
}

export default nextConfig
