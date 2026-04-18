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
      {
        source: '/.well-known/oauth-authorization-server',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/.well-known/oauth-authorization-server`,
      },
      {
        source: '/.well-known/oauth-protected-resource',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/.well-known/oauth-protected-resource`,
      },
      {
        source: '/oauth/register',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/oauth/register`,
      },
      {
        source: '/oauth/token',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3005'}/oauth/token`,
      },
    ]
  },
}

export default nextConfig
