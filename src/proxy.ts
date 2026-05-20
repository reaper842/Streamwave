import { decode } from '@auth/core/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_SECRET =
  process.env['NEXTAUTH_SECRET'] ?? process.env['AUTH_SECRET'] ?? 'dev-secret-change-in-production'

// Routes accessible without authentication
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/reset-password',
  '/api/auth', // NextAuth endpoints
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))
}

function isAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/public/') ||
    /\.\w+$/.test(pathname)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through static assets and public routes without session check
  if (isAsset(pathname) || isPublic(pathname)) {
    return NextResponse.next()
  }

  // Determine cookie name based on protocol (secure vs non-secure)
  const isSecure = request.url.startsWith('https://')
  const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token'
  const sessionToken = request.cookies.get(cookieName)?.value

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const payload = await decode({
      token: sessionToken,
      secret: AUTH_SECRET,
      salt: cookieName,
    })

    if (!payload) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Admin routes require the isAdmin flag in the JWT
    if (pathname.startsWith('/admin')) {
      if (!payload.isAdmin) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  // Run proxy on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
