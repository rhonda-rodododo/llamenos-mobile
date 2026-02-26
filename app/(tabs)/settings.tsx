/**
 * Settings screen — account info, hub config, theme, language, lock/logout (Epic 89 polish).
 */

import { useState, useCallback, useEffect } from 'react'
import { View, Text, Pressable, Alert, ScrollView, TextInput, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, useHubConfigStore, useSettingsStore } from '@/lib/store'
import { useIsAdmin } from '@/hooks/usePermission'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import { unregisterDevices } from '@/lib/push-notifications'
import { setLanguage, languageLabels, supportedLanguages } from '@/lib/i18n'
import { colors, type ThemePref } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'

const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export default function SettingsScreen() {
  const { t, i18n } = useTranslation()
  const { colorScheme } = useColorScheme()
  const publicKey = useAuthStore(s => s.publicKey)
  const isAdminPerm = useIsAdmin()
  const clearAuth = useAuthStore(s => s.clearAuth)
  const hubUrl = useHubConfigStore(s => s.hubUrl)
  const hubName = useHubConfigStore(s => s.hubName)
  const queryClient = useQueryClient()
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'

  // Settings store
  const themePref = useSettingsStore(s => s.themePref)
  const setThemePref = useSettingsStore(s => s.setThemePref)
  const savedLang = useSettingsStore(s => s.language)
  const setLangPref = useSettingsStore(s => s.setLanguage)
  const [showLangPicker, setShowLangPicker] = useState(false)

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
      haptic.success()
      toast.success(t('settings.saved', 'Saved'))
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: () => {
      haptic.error()
      Alert.alert(t('settings.error', 'Error'), t('settings.saveError', 'Failed to save profile'))
    },
  })

  const handleSaveProfile = useCallback(() => {
    if (name.trim()) {
      profileMutation.mutate({ name: name.trim() })
    }
  }, [name, profileMutation])

  const handleThemeChange = (pref: ThemePref) => {
    haptic.selection()
    setThemePref(pref)
    // Theme sync happens in _layout.tsx useThemeSync hook
  }

  const handleLanguageChange = (lang: string) => {
    haptic.selection()
    setLangPref(lang)
    const needsRestart = setLanguage(lang)
    setShowLangPicker(false)
    if (needsRestart) {
      Alert.alert(
        t('settings.restartRequired', 'Restart Required'),
        t('settings.restartForRTL', 'Please restart the app for layout changes to take effect.'),
      )
    }
  }

  const handleLock = () => {
    haptic.medium()
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
            haptic.heavy()
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
      testID="settings-screen"
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => refetch()}
          tintColor={colors[scheme].primary}
        />
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
          <Text className="font-mono text-xs text-foreground" selectable accessibilityLabel={t('settings.publicKey', 'Public key')}>
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
              placeholderTextColor={colors[scheme].mutedForeground}
              accessibilityLabel={t('settings.displayName', 'Display Name')}
            />
          </View>
          <Pressable
            className="rounded-lg bg-primary px-4 py-2.5"
            onPress={handleSaveProfile}
            disabled={profileMutation.isPending}
            accessibilityLabel={t('settings.saveProfile', 'Save Profile')}
            accessibilityRole="button"
            accessibilityState={{ disabled: profileMutation.isPending }}
          >
            <Text className="text-center text-sm font-semibold text-primary-foreground">
              {profileMutation.isPending
                ? t('settings.saving', 'Saving...')
                : t('settings.saveProfile', 'Save Profile')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Appearance */}
      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="mb-3 text-sm font-medium text-muted-foreground">
          {t('settings.appearance', 'Appearance')}
        </Text>

        {/* Theme toggle */}
        <View className="mb-3">
          <Text className="mb-2 text-xs text-muted-foreground">
            {t('settings.theme', 'Theme')}
          </Text>
          <View className="flex-row gap-2">
            {THEME_OPTIONS.map(option => (
              <Pressable
                key={option.value}
                className={`flex-1 rounded-lg px-3 py-2 ${
                  themePref === option.value
                    ? 'bg-primary'
                    : 'border border-border'
                }`}
                onPress={() => handleThemeChange(option.value)}
                accessibilityLabel={`${option.label} theme`}
                accessibilityRole="radio"
                accessibilityState={{ selected: themePref === option.value }}
                testID={`settings-theme-${option.value}`}
              >
                <Text
                  className={`text-center text-sm font-medium ${
                    themePref === option.value ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Language picker */}
        <View>
          <Text className="mb-2 text-xs text-muted-foreground">
            {t('settings.language', 'Language')}
          </Text>
          <Pressable
            className="rounded-lg border border-border px-3 py-2.5"
            onPress={() => { haptic.light(); setShowLangPicker(!showLangPicker) }}
            accessibilityLabel={`${t('settings.language', 'Language')}: ${languageLabels[savedLang ?? i18n.language] ?? 'English'}`}
            accessibilityRole="button"
            testID="settings-language-picker"
          >
            <Text className="text-sm text-foreground">
              {languageLabels[savedLang ?? i18n.language] ?? 'English'}
            </Text>
          </Pressable>

          {showLangPicker && (
            <View className="mt-2 rounded-lg border border-border bg-background">
              {supportedLanguages.map(lang => (
                <Pressable
                  key={lang}
                  className={`border-b border-border px-3 py-2.5 ${
                    (savedLang ?? i18n.language) === lang ? 'bg-primary/10' : ''
                  }`}
                  onPress={() => handleLanguageChange(lang)}
                  accessibilityLabel={languageLabels[lang]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: (savedLang ?? i18n.language) === lang }}
                >
                  <Text className={`text-sm ${(savedLang ?? i18n.language) === lang ? 'font-semibold text-primary' : 'text-foreground'}`}>
                    {languageLabels[lang]}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
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
              onPress={() => { haptic.light(); router.push(item.route as never) }}
              accessibilityLabel={item.label}
              accessibilityRole="button"
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
        accessibilityLabel={t('settings.lock', 'Lock App')}
        accessibilityRole="button"
        testID="settings-lock-btn"
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
        accessibilityLabel={t('settings.logout', 'Log Out')}
        accessibilityRole="button"
        testID="settings-wipe-btn"
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
