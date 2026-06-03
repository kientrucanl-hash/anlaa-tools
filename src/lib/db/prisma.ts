import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Prisma's InputJsonValue doesn't accept plain `unknown` / `null` directly.
// Use these helpers wherever a Prisma JSON field is written.
export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

// For nullable JSON fields (Json?) — pass null → Prisma.JsonNull
export function toNullableJson(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}
