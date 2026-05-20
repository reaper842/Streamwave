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
  // CSP — non-obvious allowances:
  //   script-src  'unsafe-inline' 'unsafe-eval' — Next.js RSC hydration + Turbopack dev HMR
  //   img-src     fastly.picsum.photos (dev) — picsum.photos redirects here; Chrome CSP L2 checks both hops
  //   media-src   data: — Howler.js _clearSound() sets <audio>.src to silent WAV on howl.unload()
  //   connect-src localhost:3001 (dev) / NEXT_PUBLIC_API_URL (prod) — browser → Fastify API; throws if unset or invalid in prod
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      [
        "img-src 'self' data: blob: https://picsum.photos",
        process.env['NODE_ENV'] !== 'production' ? 'https://fastly.picsum.photos' : null,
        'https://images.unsplash.com',
      ]
        .filter(Boolean)
        .join(' '),
      "media-src 'self' blob: data:",
      [
        "connect-src 'self'",
        process.env['NODE_ENV'] !== 'production'
          ? 'http://localhost:3001 https://localhost:3001'
          : (() => {
              const raw = process.env['NEXT_PUBLIC_API_URL']
              if (!raw) {
                throw new Error('NEXT_PUBLIC_API_URL must be set in production for CSP connect-src')
              }
              try {
                return new URL(raw).origin
              } catch {
                throw new Error(`NEXT_PUBLIC_API_URL must be a valid URL (got: ${raw})`)
              }
            })(),
      ]
        .filter(Boolean)
        .join(' '),
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Required for Docker deployment: generates .next/standalone/ with a self-contained server.js
  output: 'standalone',

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
      // Production-only: Turbopack reuses chunk URLs across recompiles, so any max-age > 0 in dev
      // causes the browser to serve stale JS — even after clearing site data. In production,
      // content-hashed filenames make long-term caching safe.
      // /_next/static/ Cache-Control (immutable, 1 year) is set automatically by Next.js — no rule needed.
      ...(process.env['NODE_ENV'] === 'production'
        ? [
            {
              // API routes must never be cached — dynamic auth/session/data responses
              source: '/api/(.*)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'no-store',
                },
              ],
            },
            {
              // 1-day cache for audio files only (public/audio/ volume mount)
              source: '/audio/(.*)',
              headers: [
                {
                  key: 'Cache-Control',
                  value: 'public, max-age=86400, stale-while-revalidate=604800',
                },
              ],
            },
          ]
        : []),
    ]
  },
}

export default withBundleAnalyzer(nextConfig)
