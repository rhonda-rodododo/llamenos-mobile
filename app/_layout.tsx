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

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'modal', gestureEnabled: false }}
        />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  )
}
