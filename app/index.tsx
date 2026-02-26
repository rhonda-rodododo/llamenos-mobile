/**
 * Root index — auth redirect.
 * Checks auth state and redirects to login or tabs.
 */

import { Redirect } from 'expo-router'
import { useAuthStore } from '@/lib/store'

export default function Index() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/login" />
}
