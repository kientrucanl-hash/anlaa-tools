import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { prisma } from '@/lib/db/prisma'

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/public',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow login page
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
    const session = await prisma.session.findUnique({
      where: { sessionToken: payload.sid },
    })
    if (!session || session.userId !== payload.id) {
      throw new Error('Session revoked')
    }

    const res = NextResponse.next()
    res.headers.set('x-user-id', String(payload.id))
    res.headers.set('x-user-role', payload.role)
    res.headers.set('x-user-username', payload.username)
    return res
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
