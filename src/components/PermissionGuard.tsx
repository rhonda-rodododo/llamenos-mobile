/**
 * Permission-based UI gating.
 * Hides children when user lacks the required permission.
 */

import type { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'

interface PermissionGuardProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const allowed = usePermission(permission)
  return allowed ? <>{children}</> : <>{fallback}</>
}
