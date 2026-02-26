/**
 * Small indicator showing Nostr relay connection state (Epic 89 a11y).
 */

import { View, Text } from 'react-native'
import { useRelayState } from '@/lib/nostr/context'
import { useTranslation } from 'react-i18next'

export function RelayStatus() {
  const { t } = useTranslation()
  const state = useRelayState()

  if (state === 'connected') return null

  const dotColors = {
    connecting: 'bg-yellow-500',
    disconnected: 'bg-red-500',
    authenticating: 'bg-yellow-500',
  } as const

  const labels = {
    connecting: t('relay.connecting', 'Connecting...'),
    disconnected: t('relay.disconnected', 'Offline'),
    authenticating: t('relay.authenticating', 'Authenticating...'),
  } as const

  return (
    <View
      className="flex-row items-center gap-2 rounded-lg bg-card px-3 py-1.5"
      accessibilityLabel={`${t('relay.status', 'Relay')}: ${labels[state]}`}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
    >
      <View className={`h-2 w-2 rounded-full ${dotColors[state]}`} accessibilityElementsHidden />
      <Text className="text-xs text-muted-foreground">{labels[state]}</Text>
    </View>
  )
}
