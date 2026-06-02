import jwt from 'jsonwebtoken'

export interface JwtPayload {
  id: number
  username: string
  role: 'USER' | 'ADMIN'
  sid: string
}

const SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = '8h'

export function signToken(payload: JwtPayload): string {
  if (!SECRET || SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters')
  }
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}
