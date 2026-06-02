import { prisma } from '@/lib/db/prisma'
import type { CollabRole } from '@/lib/types/models'

type ProjectLike = { id: number; userId: number }

// Returns the effective role for a user on a project, or null if no access
export async function getCollabRole(
  project: ProjectLike,
  userId: number,
  userRole: 'USER' | 'ADMIN'
): Promise<'EDITOR' | 'VIEWER' | 'OWNER' | null> {
  if (userRole === 'ADMIN') return 'OWNER'
  if (project.userId === userId) return 'OWNER'

  const collab = await prisma.projectCollaborator.findUnique({
    where: { projectId_inviteeId: { projectId: project.id, inviteeId: userId } },
  })
  if (collab?.status === 'ACCEPTED') return collab.role as 'EDITOR' | 'VIEWER'
  return null
}

export function canEdit(role: string | null): boolean {
  return role === 'OWNER' || role === 'EDITOR'
}

export function canManage(role: string | null): boolean {
  return role === 'OWNER'
}
