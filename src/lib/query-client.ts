/**
 * React Query client setup for React Native.
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
      retry: 2,
      refetchOnWindowFocus: false, // Not meaningful in RN; use focusManager above
    },
  },
})
