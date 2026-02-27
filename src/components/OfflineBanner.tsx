/**
 * Offline/disconnected banner (Epic 89).
 *
 * Shows a warning when the device loses network or the Nostr relay disconnects.
 * Uses @react-native-community/netinfo for network state and
 * the Nostr relay context for relay connection state.
 */

import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { useTranslation } from 'react-i18next'
import { useRelayState } from '@/lib/nostr/context'

export function OfflineBanner() {
  const { t } = useTranslation()
  const relayState = useRelayState()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false)
    })
    return () => unsubscribe()
  }, [])

  if (isOnline && relayState !== 'disconnected') return null

  return (
    <View
      className="flex-row items-center bg-destructive/10 px-4 py-2"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="offline-banner"
    >
      <Text className="text-sm font-medium text-destructive">
        {!isOnline
          ? t('common.offline', 'No internet connection')
          : t('common.relayDisconnected', 'Relay disconnected — reconnecting...')}
      </Text>
    </View>
  )
}
