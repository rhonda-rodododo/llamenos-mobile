/**
 * Shift card — shows shift details with signup/drop action.
 */

import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { Shift } from '@/lib/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

interface ShiftCardProps {
  shift: Shift
  isSignedUp: boolean
  onSignUp: () => void
  onDrop: () => void
  loading?: boolean
}

export function ShiftCard({ shift, isSignedUp, onSignUp, onDrop, loading }: ShiftCardProps) {
  const { t } = useTranslation()

  return (
    <View className="rounded-xl border border-border bg-card p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground">
          {shift.name}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {shift.startTime} – {shift.endTime}
        </Text>
      </View>

      {/* Day badges */}
      <View className="mb-3 flex-row gap-1">
        {DAY_LABELS.map((label, i) => (
          <View
            key={label}
            className={`rounded-full px-2 py-0.5 ${
              shift.days.includes(i)
                ? 'bg-primary/10'
                : 'bg-muted/20'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                shift.days.includes(i)
                  ? 'text-primary'
                  : 'text-muted-foreground/50'
              }`}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">
          {t('shifts.volunteers', '{{count}} volunteers', { count: shift.volunteerPubkeys.length })}
        </Text>

        <Pressable
          className={`rounded-lg px-4 py-2 ${
            isSignedUp ? 'border border-destructive/30 bg-destructive/5' : 'bg-primary'
          }`}
          onPress={isSignedUp ? onDrop : onSignUp}
          disabled={loading}
        >
          <Text
            className={`text-sm font-medium ${
              isSignedUp ? 'text-destructive' : 'text-primary-foreground'
            }`}
          >
            {isSignedUp
              ? t('shifts.drop', 'Drop')
              : t('shifts.signUp', 'Sign Up')}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
