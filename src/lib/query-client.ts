/**
 * React Query client setup for React Native (Epic 89 polish).
 * Includes mutation retry for offline resilience.
 */

import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'
import * as Network from 'expo-network'

// --- Focus manager: refetch on app foreground ---

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active')
}

AppState.addEventListener('change', onAppStateChange)

// --- Online manager: track network state ---

onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((state) => {
    setOnline(!!state.isConnected)
  })
  return () => sub.remove()
})

// --- Query Client ---

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000, // 5 minutes — cached data visible when offline
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
  },
})
