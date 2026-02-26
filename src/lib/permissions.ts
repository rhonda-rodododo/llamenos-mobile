/**
 * Permission-Based Access Control (PBAC)
 *
 * Direct port from web app's src/shared/permissions.ts.
 * Pure TypeScript — zero platform deps.
 */

export const PERMISSION_CATALOG = {
  'calls:answer': 'Answer incoming calls',
  'calls:read-active': 'See active calls (caller info redacted)',
  'calls:read-active-full': 'See active calls with full caller info',
  'calls:read-history': 'View call history',
  'calls:read-presence': 'View volunteer presence',
  'calls:read-recording': 'Listen to call recordings',
  'calls:debug': 'Debug call state',
  'notes:create': 'Create call notes',
  'notes:read-own': 'Read own notes',
  'notes:read-all': 'Read all notes',
  'notes:read-assigned': 'Read notes from assigned volunteers',
  'notes:update-own': 'Update own notes',
  'reports:create': 'Submit reports',
  'reports:read-own': 'Read own reports',
  'reports:read-all': 'Read all reports',
  'reports:read-assigned': 'Read assigned reports',
  'reports:assign': 'Assign reports to reviewers/volunteers',
  'reports:update': 'Update report status',
  'reports:send-message-own': 'Send messages in own reports',
  'reports:send-message': 'Send messages in any report',
  'conversations:read-assigned': 'Read assigned + waiting conversations',
  'conversations:read-all': 'Read all conversations',
  'conversations:claim': 'Claim a waiting conversation',
  'conversations:claim-sms': 'Claim SMS conversations',
  'conversations:claim-whatsapp': 'Claim WhatsApp conversations',
  'conversations:claim-signal': 'Claim Signal conversations',
  'conversations:claim-rcs': 'Claim RCS conversations',
  'conversations:claim-web': 'Claim web conversations',
  'conversations:claim-any': 'Claim any channel (bypass restrictions)',
  'conversations:send': 'Send messages in assigned conversations',
  'conversations:send-any': 'Send messages in any conversation',
  'conversations:update': 'Reassign/close/reopen conversations',
  'volunteers:read': 'List/view volunteer profiles',
  'volunteers:create': 'Create new volunteers',
  'volunteers:update': 'Update volunteer profiles',
  'volunteers:delete': 'Deactivate/delete volunteers',
  'volunteers:manage-roles': 'Assign/change volunteer roles',
  'shifts:read-own': 'Check own shift status',
  'shifts:read': 'View all shifts',
  'shifts:create': 'Create shifts',
  'shifts:update': 'Modify shifts',
  'shifts:delete': 'Delete shifts',
  'shifts:manage-fallback': 'Manage fallback ring group',
  'bans:report': 'Report/flag a number',
  'bans:read': 'View ban list',
  'bans:create': 'Ban numbers',
  'bans:bulk-create': 'Bulk ban import',
  'bans:delete': 'Remove bans',
  'invites:read': 'View pending invites',
  'invites:create': 'Create invite codes',
  'invites:revoke': 'Revoke invite codes',
  'settings:read': 'View settings',
  'settings:manage': 'Modify all settings',
  'settings:manage-telephony': 'Modify telephony provider',
  'settings:manage-messaging': 'Modify messaging channels',
  'settings:manage-spam': 'Modify spam settings',
  'settings:manage-ivr': 'Modify IVR/language settings',
  'settings:manage-fields': 'Modify custom fields',
  'settings:manage-transcription': 'Modify transcription settings',
  'audit:read': 'View audit log',
  'blasts:read': 'View blast history',
  'blasts:send': 'Send blasts',
  'blasts:manage': 'Manage subscriber lists and templates',
  'blasts:schedule': 'Schedule future blasts',
  'files:upload': 'Upload files',
  'files:download-own': 'Download own/authorized files',
  'files:download-all': 'Download any file',
  'files:share': 'Re-encrypt/share files with others',
  'system:manage-roles': 'Create/edit/delete custom roles',
  'system:manage-hubs': 'Create/manage hubs',
  'system:manage-instance': 'Instance-level settings',
} as const

export type Permission = keyof typeof PERMISSION_CATALOG

export interface Role {
  id: string
  name: string
  slug: string
  permissions: string[]
  isDefault: boolean
  isSystem: boolean
  description: string
  createdAt: string
  updatedAt: string
}

export function permissionGranted(grantedPermissions: string[], required: string): boolean {
  if (grantedPermissions.includes('*')) return true
  if (grantedPermissions.includes(required)) return true
  const domain = required.split(':')[0]
  if (grantedPermissions.includes(`${domain}:*`)) return true
  return false
}

export function resolvePermissions(roleIds: string[], roles: Role[]): string[] {
  const perms = new Set<string>()
  for (const roleId of roleIds) {
    const role = roles.find(r => r.id === roleId)
    if (role) {
      for (const p of role.permissions) perms.add(p)
    }
  }
  return Array.from(perms)
}

export function hasPermission(roleIds: string[], roles: Role[], permission: string): boolean {
  const perms = resolvePermissions(roleIds, roles)
  return permissionGranted(perms, permission)
}

export function canClaimChannel(permissions: string[], channelType: string): boolean {
  if (permissionGranted(permissions, 'conversations:claim-any')) return true
  const channelPerms: Record<string, string> = {
    sms: 'conversations:claim-sms',
    whatsapp: 'conversations:claim-whatsapp',
    signal: 'conversations:claim-signal',
    rcs: 'conversations:claim-rcs',
    web: 'conversations:claim-web',
  }
  const perm = channelPerms[channelType]
  return perm ? permissionGranted(permissions, perm) : false
}
