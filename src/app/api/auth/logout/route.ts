import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/auth/middleware'
import { verifyToken } from '@/lib/auth/jwt'
import { deleteSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  try {
    const token =
      req.headers.get('authorization')?.replace('Bearer ', '') ??
      req.cookies.get('anlaa_token')?.value

    if (token) {
      try {
        const payload = verifyToken(token)
        await deleteSession(payload.sid)
      } catch {
        // Token already invalid — still clear cookie
      }
    }

    const response = NextResponse.json({ message: 'Đã đăng xuất' })
    response.cookies.delete('anlaa_token')
    return response
  } catch {
    return NextResponse.json({ error: 'Lỗi hệ thống.' }, { status: 500 })
  }
}
