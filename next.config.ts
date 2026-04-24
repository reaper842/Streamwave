import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env['ANALYZE'] === 'true' })

// Security headers applied to every response from Next.js.
// See: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
const securityHeaders = [
  // Prevent clickjacking — only allow framing by same origin
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Block MIME-type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer policy — don't leak path to third-party origins
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Permissions policy — restrict unused browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // HSTS — instruct browsers to only connect via HTTPS for 2 years (production only)
  // Omitted in development so localhost dev over HTTP is not permanently broken.
  ...(process.env['NODE_ENV'] === 'production'
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
  // Content Security Policy
  // - default-src 'self': only load resources from the same origin by default
  // - script-src: allow Next.js inline scripts ('unsafe-inline' needed for RSC/hydration)
  // - style-src: allow inline styles (Tailwind injects styles at runtime)
  // - img-src: allow same-origin, data URIs, and picsum.photos (dev placeholder images)
  // - media-src: allow audio/video from same-origin and blob: (Howler.js creates blob URLs)
  // - connect-src: allow API calls to self and the Fastify backend
  // - font-src: allow Google Fonts
  // - frame-ancestors: disallow embedding (XFO above handles older browsers)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://picsum.photos https://images.unsplash.com",
      "media-src 'self' blob:",
      "connect-src 'self' http://localhost:3001 https://localhost:3001",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Long-lived cache for Next.js static assets (chunks, JS, CSS with content hash in filename)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache public/ static files for 1 day (audio files are developer-local so no long TTL)
        source: '/(.+)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
