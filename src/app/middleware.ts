import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

// Prisma cannot run in Edge Runtime — session revocation is enforced
// in individual API route handlers via getRequestUser() which hits the DB.

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/public',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname === '/login') return NextResponse.next()

  const token =
    req.headers.get('authorization')?.replace('Bearer ', '') ??
    req.cookies.get('anlaa_token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const payload = verifyToken(token)

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', String(payload.id))
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-user-username', payload.username)
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('anlaa_token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
