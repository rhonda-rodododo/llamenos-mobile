/**
 * Root layout — global providers and navigation setup.
 * Wraps the entire app with NativeWind, i18n, React Query, and Nostr relay.
 */

import '../global.css'
import '@/lib/i18n'

import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { NostrProvider } from '@/lib/nostr/context'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import * as keyManager from '@/lib/key-manager'

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

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
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
