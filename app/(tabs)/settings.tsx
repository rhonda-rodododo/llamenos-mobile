/**
 * Settings screen — account, hub config, lock/logout.
 * Placeholder until Epic 84 implements full screens.
 */

import { View, Text, Pressable, Alert } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import * as keyManager from '@/lib/key-manager'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const hubUrl = useHubConfigStore(s => s.hubUrl)
  const hubName = useHubConfigStore(s => s.hubName)

  const handleLock = () => {
    keyManager.lock()
    clearAuth()
    router.replace('/login')
  }

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutTitle', 'Log Out'),
      t('settings.logoutMessage', 'This will remove your key from this device. Make sure you have your nsec backed up.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.logout', 'Log Out'),
          style: 'destructive',
          onPress: async () => {
            await keyManager.wipeKey()
            clearAuth()
            router.replace('/login')
          },
        },
      ],
    )
  }

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <View className="gap-4">
        {/* Hub info */}
        <View className="rounded-xl border border-border bg-card p-4">
          <Text className="mb-1 text-sm font-medium text-muted-foreground">
            {t('settings.hub', 'Connected Hub')}
          </Text>
          <Text className="text-base font-semibold text-foreground">
            {hubName ?? t('settings.noHub', 'Not connected')}
          </Text>
          {hubUrl && (
            <Text className="mt-1 text-xs text-muted-foreground">
              {hubUrl}
            </Text>
          )}
        </View>

        {/* Lock */}
        <Pressable
          className="rounded-xl border border-border bg-card p-4"
          onPress={handleLock}
        >
          <Text className="text-base font-medium text-foreground">
            {t('settings.lock', 'Lock App')}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {t('settings.lockDescription', 'Lock and require PIN to re-enter')}
          </Text>
        </Pressable>

        {/* Logout */}
        <Pressable
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          onPress={handleLogout}
        >
          <Text className="text-base font-medium text-destructive">
            {t('settings.logout', 'Log Out')}
          </Text>
          <Text className="mt-1 text-sm text-destructive/70">
            {t('settings.logoutDescription', 'Remove your key from this device')}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
