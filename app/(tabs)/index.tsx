/**
 * Dashboard — main screen after authentication.
 * Shows active call status, on-shift status, and quick actions.
 * Placeholder until Epic 84 implements full screens.
 */

import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useHubConfigStore } from '@/lib/store'

export default function DashboardScreen() {
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)
  const role = useAuthStore(s => s.role)
  const hubName = useHubConfigStore(s => s.hubName)

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="mb-2 text-2xl font-bold text-foreground">
        {hubName ?? t('app.name', 'Hotline')}
      </Text>
      <Text className="mb-8 text-base text-muted-foreground">
        {t('dashboard.welcome', 'Welcome back')}
      </Text>

      <View className="w-full max-w-sm gap-4">
        {/* Status card */}
        <View className="rounded-xl border border-border bg-card p-4">
          <Text className="mb-1 text-sm font-medium text-muted-foreground">
            {t('dashboard.status', 'Status')}
          </Text>
          <Text className="text-lg font-semibold text-foreground">
            {t('dashboard.offShift', 'Off Shift')}
          </Text>
        </View>

        {/* Role indicator */}
        <View className="rounded-xl border border-border bg-card p-4">
          <Text className="mb-1 text-sm font-medium text-muted-foreground">
            {t('dashboard.role', 'Role')}
          </Text>
          <Text className="text-lg font-semibold capitalize text-foreground">
            {role ?? t('dashboard.unknown', 'Unknown')}
          </Text>
        </View>

        {/* Public key (truncated) */}
        {publicKey && (
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="mb-1 text-sm font-medium text-muted-foreground">
              {t('dashboard.identity', 'Identity')}
            </Text>
            <Text className="font-mono text-xs text-foreground" selectable>
              {publicKey.slice(0, 8)}...{publicKey.slice(-8)}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}
