/**
 * Permission hook for React Native.
 * Uses the /api/auth/me response for permission checking.
 */

import { useQuery } from '@tanstack/react-query'
import { permissionGranted } from '@/lib/permissions'
import { useAuthStore } from '@/lib/store'
import * as apiClient from '@/lib/api-client'

export function useMe() {
  const publicKey = useAuthStore(s => s.publicKey)
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.getMe(),
    enabled: !!publicKey,
    staleTime: 60_000, // Cache for 1 minute
  })
}

export function usePermission(permission: string): boolean {
  const { data: me } = useMe()
  if (!me?.permissions) return false
  return permissionGranted(me.permissions, permission)
}

export function usePermissions(): string[] {
  const { data: me } = useMe()
  return me?.permissions ?? []
}

export function useIsAdmin(): boolean {
  return usePermission('volunteers:read')
}
