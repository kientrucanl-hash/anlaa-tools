'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api/client'
import type { Project } from '@/lib/types/models'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list() as Promise<Project[]>,
  })
}

export function useProject(id: number | null) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectsApi.get(id!) as Promise<Project>,
    enabled: id != null,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; address?: string }) => projectsApi.create(data) as Promise<Project>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.update(id, data) as Promise<Project>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['projects', id] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useSubmitProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => projectsApi.submit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
