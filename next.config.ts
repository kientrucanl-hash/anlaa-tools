import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Required for @univerjs/presets large bundle
    largePageDataBytes: 128 * 1024,
  },
  // Allow Socket.io server URL cross-origin in dev
  async rewrites() {
    return [
      { source: '/pricing/ntp', destination: '/pricing?view=ntp' },
      { source: '/pricing/selling', destination: '/pricing?view=selling' },
      { source: '/pricing/templates', destination: '/pricing?view=templates' },
    ]
  },
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
