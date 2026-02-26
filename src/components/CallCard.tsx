/**
 * Call status card — shows ringing or active call info (Epic 89 a11y).
 */

import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useCallTimer } from '@/lib/hooks'
import { haptic } from '@/lib/haptics'
import type { ActiveCall } from '@/lib/types'

interface CallCardProps {
  call: ActiveCall
  onAnswer?: () => void
  onHangup?: () => void
  onSpam?: () => void
  isCurrent?: boolean
}

export function CallCard({ call, onAnswer, onHangup, onSpam, isCurrent }: CallCardProps) {
  const { t } = useTranslation()
  const { formatted } = useCallTimer(
    call.status === 'in-progress' ? call.startedAt : null,
  )

  const isRinging = call.status === 'ringing'
  const statusLabel = isRinging
    ? t('calls.ringing', 'Incoming Call')
    : t('calls.inProgress', 'In Progress')

  return (
    <View
      className={`rounded-xl border p-4 ${
        isRinging
          ? 'border-primary bg-primary/5'
          : isCurrent
            ? 'border-green-500 bg-green-500/5'
            : 'border-border bg-card'
      }`}
      accessibilityLabel={`${statusLabel}${call.callerLast4 ? `, caller ending ${call.callerLast4}` : ''}${call.status === 'in-progress' ? `, ${formatted}` : ''}`}
      accessibilityRole="summary"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className={`h-3 w-3 rounded-full ${
              isRinging ? 'bg-primary' : 'bg-green-500'
            }`}
            accessibilityElementsHidden
          />
          <Text className="text-sm font-semibold text-foreground">
            {statusLabel}
          </Text>
        </View>
        {call.status === 'in-progress' && (
          <Text className="font-mono text-sm text-muted-foreground" accessibilityLabel={`Duration ${formatted}`}>
            {formatted}
          </Text>
        )}
      </View>

      {call.callerLast4 && (
        <Text className="mb-3 text-xs text-muted-foreground">
          {t('calls.callerLast4', 'Caller: ...{{last4}}', { last4: call.callerLast4 })}
        </Text>
      )}

      <View className="flex-row gap-2">
        {isRinging && onAnswer && (
          <Pressable
            className="flex-1 rounded-lg bg-green-600 px-3 py-2"
            onPress={() => { haptic.medium(); onAnswer() }}
            accessibilityLabel={t('calls.answer', 'Answer')}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('calls.answer', 'Answer')}
            </Text>
          </Pressable>
        )}
        {isCurrent && onHangup && (
          <Pressable
            className="flex-1 rounded-lg bg-destructive px-3 py-2"
            onPress={() => { haptic.warning(); onHangup() }}
            accessibilityLabel={t('calls.hangup', 'Hang Up')}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('calls.hangup', 'Hang Up')}
            </Text>
          </Pressable>
        )}
        {isRinging && onSpam && (
          <Pressable
            className="rounded-lg border border-destructive/30 px-3 py-2"
            onPress={() => { haptic.warning(); onSpam() }}
            accessibilityLabel={t('calls.spam', 'Report as Spam')}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-center text-sm text-destructive">
              {t('calls.spam', 'Spam')}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
