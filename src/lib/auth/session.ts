import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: number, ip?: string, userAgent?: string) {
  const token = generateSessionToken()
  return prisma.session.create({
    data: { userId, sessionToken: token, ip, userAgent },
  })
}

export async function findSession(sessionToken: string) {
  return prisma.session.findUnique({ where: { sessionToken } })
}

export async function touchSession(sessionToken: string) {
  return prisma.session.update({
    where: { sessionToken },
    data: { lastSeen: new Date() },
  })
}

export async function deleteSession(sessionToken: string) {
  return prisma.session.delete({ where: { sessionToken } })
}

export async function deleteAllUserSessions(userId: number) {
  return prisma.session.deleteMany({ where: { userId } })
}

export async function pruneOldSessions(userId: number, maxSessions: number) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { lastSeen: 'asc' },
  })
  if (sessions.length >= maxSessions) {
    const toDelete = sessions.slice(0, sessions.length - maxSessions + 1)
    await prisma.session.deleteMany({
      where: { id: { in: toDelete.map((s: { id: number }) => s.id) } },
    })
  }
}
