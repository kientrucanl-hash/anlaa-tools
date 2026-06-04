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
      { source: '/admin/users', destination: '/admin?tab=users' },
      { source: '/admin/projects', destination: '/admin?tab=projects' },
      { source: '/estimate/:id', destination: '/estimate?projectId=:id' },
      { source: '/materials/:id', destination: '/materials?projectId=:id' },
      { source: '/contractors/:id', destination: '/contractors?id=:id' },
      { source: '/history/:id', destination: '/history?id=:id' },
      { source: '/quotations/:id', destination: '/quotations?id=:id' },
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
