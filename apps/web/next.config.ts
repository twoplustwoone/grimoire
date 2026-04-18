import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/api/auth/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/:path*`,
      },
      {
        source: '/mcp',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/mcp`,
      },
      {
        source: '/mcp/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/mcp/:path*`,
      },
    ]
  },
}

export default nextConfig
