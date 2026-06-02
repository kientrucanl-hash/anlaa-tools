import { NextRequest } from 'next/server'

export interface RequestUser {
  id: number
  role: 'USER' | 'ADMIN'
  username?: string
}

export function getRequestUser(req: NextRequest): RequestUser {
  const id = req.headers.get('x-user-id')
  const role = req.headers.get('x-user-role')
  if (!id || !role) throw new Error('Unauthorized')
  return {
    id: parseInt(id, 10),
    role: role as 'USER' | 'ADMIN',
    username: req.headers.get('x-user-username') ?? undefined,
  }
}

export function requireAdmin(user: RequestUser): void {
  if (user.role !== 'ADMIN') throw new Error('Forbidden')
}
