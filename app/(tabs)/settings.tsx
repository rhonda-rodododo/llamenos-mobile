/**
 * Settings screen — account info, hub config, lock/logout, profile.
 */

import { useState, useCallback, useEffect } from 'react'
import { View, Text, Pressable, Alert, ScrollView, TextInput, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import { useIsAdmin } from '@/hooks/usePermission'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import { unregisterDevices } from '@/lib/push-notifications'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)
  const isAdminStore = useAuthStore(s => s.isAdmin)
  const isAdminPerm = useIsAdmin()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const hubUrl = useHubConfigStore(s => s.hubUrl)
  const hubName = useHubConfigStore(s => s.hubName)
  const queryClient = useQueryClient()

  // Fetch profile info
  const { data: me, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.getMe(),
    enabled: !!publicKey,
  })

  const [name, setName] = useState('')
  useEffect(() => {
    if (me?.name) setName(me.name)
  }, [me?.name])

  const profileMutation = useMutation({
    mutationFn: (data: { name: string }) => apiClient.updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      Alert.alert(t('settings.saved', 'Saved'))
    },
    onError: () => Alert.alert(t('settings.error', 'Error'), t('settings.saveError', 'Failed to save profile')),
  })

  const handleSaveProfile = useCallback(() => {
    if (name.trim()) {
      profileMutation.mutate({ name: name.trim() })
    }
  }, [name, profileMutation])

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
            await unregisterDevices()
            await keyManager.wipeKey()
            clearAuth()
            router.replace('/login')
          },
        },
      ],
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-4"
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => refetch()} />
      }
    >
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

      {/* Identity */}
      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="mb-1 text-sm font-medium text-muted-foreground">
          {t('settings.identity', 'Identity')}
        </Text>
        {publicKey && (
          <Text className="font-mono text-xs text-foreground" selectable>
            {publicKey}
          </Text>
        )}
        {me && (
          <View className="mt-2 flex-row flex-wrap gap-1">
            {me.roles.map(role => (
              <View key={role} className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-xs font-medium capitalize text-primary">{role}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Profile */}
      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="mb-3 text-sm font-medium text-muted-foreground">
          {t('settings.profile', 'Profile')}
        </Text>
        <View className="gap-3">
          <View>
            <Text className="mb-1 text-xs text-muted-foreground">
              {t('settings.displayName', 'Display Name')}
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              value={name}
              onChangeText={setName}
              placeholder={t('settings.namePlaceholder', 'Your name')}
            />
          </View>
          <Pressable
            className="rounded-lg bg-primary px-4 py-2.5"
            onPress={handleSaveProfile}
            disabled={profileMutation.isPending}
          >
            <Text className="text-center text-sm font-semibold text-primary-foreground">
              {profileMutation.isPending
                ? t('settings.saving', 'Saving...')
                : t('settings.saveProfile', 'Save Profile')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Admin section */}
      {isAdminPerm && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-muted-foreground">
            {t('settings.admin', 'Administration')}
          </Text>
          {[
            { route: '/admin/volunteers', label: t('admin.volunteers', 'Volunteers') },
            { route: '/admin/bans', label: t('admin.bans', 'Ban List') },
            { route: '/admin/audit', label: t('admin.audit', 'Audit Log') },
            { route: '/admin/settings', label: t('admin.settings', 'Hub Settings') },
          ].map(item => (
            <Pressable
              key={item.route}
              className="rounded-xl border border-border bg-card p-4"
              onPress={() => router.push(item.route as never)}
            >
              <Text className="text-base font-medium text-foreground">{item.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Actions */}
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
    </ScrollView>
  )
}
