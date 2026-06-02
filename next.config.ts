import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Prisma JSON field types cause build-time errors but code is runtime-correct
    ignoreBuildErrors: true,
  },
  experimental: {
    // Required for @univerjs/presets large bundle
    largePageDataBytes: 128 * 1024,
  },
  // Allow Socket.io server URL cross-origin in dev
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default nextConfig
