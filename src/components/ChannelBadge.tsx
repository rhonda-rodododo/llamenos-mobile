/**
 * Channel type badge — SMS, WhatsApp, Signal, RCS, Web.
 */

import { View, Text } from 'react-native'

const CHANNEL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  sms: { label: 'SMS', bg: 'bg-blue-100', text: 'text-blue-800' },
  whatsapp: { label: 'WhatsApp', bg: 'bg-green-100', text: 'text-green-800' },
  signal: { label: 'Signal', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  rcs: { label: 'RCS', bg: 'bg-orange-100', text: 'text-orange-800' },
  web: { label: 'Web', bg: 'bg-gray-100', text: 'text-gray-800' },
}

interface ChannelBadgeProps {
  channelType: string
}

export function ChannelBadge({ channelType }: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channelType] ?? { label: channelType, bg: 'bg-gray-100', text: 'text-gray-800' }

  return (
    <View className={`rounded-full px-2 py-0.5 ${config.bg}`}>
      <Text className={`text-xs font-medium ${config.text}`}>{config.label}</Text>
    </View>
  )
}
