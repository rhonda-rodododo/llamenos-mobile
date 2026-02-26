/**
 * Root layout — global providers and navigation setup.
 * Wraps the entire app with NativeWind, i18n, React Query, Nostr relay,
 * and push notification handlers.
 */

import '../global.css'
import '@/lib/i18n'

import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { NostrProvider } from '@/lib/nostr/context'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import * as keyManager from '@/lib/key-manager'
import { registerForPush, setupTokenRefreshListener } from '@/lib/push-notifications'
import { setupNotificationCategories } from '@/lib/notification-categories'
import { configureNotificationHandler, setupNotificationTapHandler, handleInitialNotification } from '@/lib/notification-handlers'

// Configure notification display handler early (before any notifications arrive)
configureNotificationHandler()

function AppProviders({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const relayUrl = useHubConfigStore(s => s.relayUrl)
  const serverPubkey = useHubConfigStore(s => s.serverPubkey)

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
      getHubKey={() => null} // Hub key distribution handled per-event
    >
      {children}
    </NostrProvider>
  )
}

function PushNotificationSetup() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    // Register push token with server
    registerForPush().catch(() => {})

    // Set up notification categories (iOS action buttons)
    setupNotificationCategories().catch(() => {})

    // Handle notification that opened the app (cold start)
    handleInitialNotification().catch(() => {})

    // Listen for push token refreshes
    const tokenSub = setupTokenRefreshListener()

    // Listen for notification taps
    const tapSub = setupNotificationTapHandler()

    return () => {
      tokenSub.remove()
      tapSub.remove()
    }
  }, [isAuthenticated])

  return null
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <PushNotificationSetup />
        <StatusBar style="auto" />
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
      </AppProviders>
    </QueryClientProvider>
  )
}
