/**
 * Root layout — global providers and navigation setup (Epic 89 polish).
 *
 * Wraps the entire app with NativeWind theme, i18n, React Query, Nostr relay,
 * push notification handlers, error boundary, offline banner, and toast.
 */

import '../global.css'
import '@/lib/i18n'

import { useEffect, useState } from 'react'
import { View, useColorScheme as useSystemColorScheme, AccessibilityInfo } from 'react-native'
import { Stack, SplashScreen } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { colorScheme } from 'nativewind'
import Toast, { type BaseToastProps } from 'react-native-toast-message'
import { Text } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { NostrProvider } from '@/lib/nostr/context'
import { useAuthStore, useHubConfigStore, useSettingsStore } from '@/lib/store'
import * as keyManager from '@/lib/key-manager'
import { registerForPush, setupTokenRefreshListener } from '@/lib/push-notifications'
import { setupNotificationCategories } from '@/lib/notification-categories'
import {
  configureNotificationHandler,
  setupNotificationTapHandler,
  handleInitialNotification,
} from '@/lib/notification-handlers'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ScreenErrorBoundary } from '@/components/ScreenErrorBoundary'
import { colors, type ResolvedScheme, type ThemePref } from '@/lib/theme'

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync()

// Configure notification display handler early (before any notifications arrive)
configureNotificationHandler()

// --- Toast config matching design system ---

function SuccessToast({ text1 }: BaseToastProps) {
  return (
    <View className="mx-4 flex-row items-center rounded-xl border border-green-500/50 bg-card px-4 py-3 shadow-lg">
      <Text className="flex-1 font-medium text-foreground">{text1}</Text>
    </View>
  )
}

function ErrorToast({ text1 }: BaseToastProps) {
  return (
    <View className="mx-4 flex-row items-center rounded-xl border border-destructive/50 bg-card px-4 py-3 shadow-lg">
      <Text className="flex-1 font-medium text-foreground">{text1}</Text>
    </View>
  )
}

function InfoToast({ text1 }: BaseToastProps) {
  return (
    <View className="mx-4 flex-row items-center rounded-xl border border-primary/50 bg-card px-4 py-3 shadow-lg">
      <Text className="flex-1 font-medium text-foreground">{text1}</Text>
    </View>
  )
}

const toastConfig = {
  success: SuccessToast,
  error: ErrorToast,
  info: InfoToast,
}

// --- Theme synchronization ---

function resolveScheme(system: string | null | undefined, pref: ThemePref): ResolvedScheme {
  if (pref !== 'system') return pref
  return system === 'dark' ? 'dark' : 'light'
}

function useThemeSync() {
  const systemScheme = useSystemColorScheme()
  const themePref = useSettingsStore((s) => s.themePref)

  useEffect(() => {
    colorScheme.set(resolveScheme(systemScheme, themePref))
  }, [themePref, systemScheme])

  return resolveScheme(systemScheme, themePref)
}

// --- Reduced motion tracking ---

function useReducedMotion() {
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion)

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion)
    return () => sub.remove()
  }, [setReduceMotion])
}

// --- Providers ---

function AppProviders({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const relayUrl = useHubConfigStore((s) => s.relayUrl)
  const serverPubkey = useHubConfigStore((s) => s.serverPubkey)

  return (
    <NostrProvider
      relayUrl={relayUrl ?? undefined}
      serverPubkey={serverPubkey ?? undefined}
      isAuthenticated={isAuthenticated}
      getSecretKey={() => {
        try {
          return keyManager.isUnlocked() ? keyManager.getSecretKey() : null
        } catch {
          return null
        }
      }}
      getHubKey={() => null}
    >
      {children}
    </NostrProvider>
  )
}

function PushNotificationSetup() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    registerForPush().catch(() => {})
    setupNotificationCategories().catch(() => {})
    handleInitialNotification().catch(() => {})

    const tokenSub = setupTokenRefreshListener()
    const tapSub = setupNotificationTapHandler()

    return () => {
      tokenSub.remove()
      tapSub.remove()
    }
  }, [isAuthenticated])

  return null
}

// --- Language initialization from saved preference ---

function useLanguageInit() {
  const savedLang = useSettingsStore((s) => s.language)

  useEffect(() => {
    if (savedLang) {
      // Dynamic import to avoid circular reference with i18n module-level init
      import('@/lib/i18n').then(({ default: i18n }) => {
        if (i18n.language !== savedLang) {
          i18n.changeLanguage(savedLang)
        }
      })
    }
  }, [savedLang])
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
  })

  const resolved = useThemeSync()
  useReducedMotion()
  useLanguageInit()

  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontsError])

  if (!fontsLoaded && !fontsError) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <PushNotificationSetup />
        <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
        <OfflineBanner />
        <ScreenErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen
              name="onboarding"
              options={{ presentation: 'modal', gestureEnabled: false }}
            />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="note/[id]"
              options={{ headerShown: true, title: 'Note' }}
            />
            <Stack.Screen
              name="call/[id]"
              options={{ headerShown: true, title: 'Call', gestureEnabled: false }}
            />
            <Stack.Screen
              name="conversation/[id]"
              options={{ headerShown: true, title: 'Conversation' }}
            />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack>
        </ScreenErrorBoundary>
        <Toast config={toastConfig} />
      </AppProviders>
    </QueryClientProvider>
  )
}
