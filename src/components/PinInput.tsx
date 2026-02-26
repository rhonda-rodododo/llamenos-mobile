/**
 * PIN entry component with individual digit inputs (Epic 89 a11y + haptics).
 * Supports 4-6 digit PINs with auto-advance.
 */

import { useRef, useState, useCallback } from 'react'
import { View, TextInput, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { haptic } from '@/lib/haptics'

interface PinInputProps {
  length?: 4 | 5 | 6
  onComplete: (pin: string) => void
  error?: string | null
  disabled?: boolean
}

export function PinInput({ length = 4, onComplete, error, disabled }: PinInputProps) {
  const { t } = useTranslation()
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(TextInput | null)[]>([])

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (disabled) return
      const digit = value.replace(/\D/g, '').slice(-1)
      const newDigits = [...digits]
      newDigits[index] = digit
      setDigits(newDigits)

      if (digit) {
        haptic.light()
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus()
        }
      }

      // Check if all digits are entered
      if (digit && newDigits.every(d => d !== '')) {
        haptic.medium()
        onComplete(newDigits.join(''))
      }
    },
    [digits, disabled, length, onComplete],
  )

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !digits[index] && index > 0) {
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      }
    },
    [digits],
  )

  const reset = useCallback(() => {
    setDigits(Array(length).fill(''))
    inputRefs.current[0]?.focus()
  }, [length])

  return (
    <View className="items-center gap-4" accessibilityLabel={t('auth.enterPin', 'Enter PIN')} testID="pin-input">
      <View className="flex-row gap-3" accessibilityRole="none">
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref }}
            className={`h-14 w-12 rounded-xl border-2 text-center text-2xl font-bold text-foreground ${
              error
                ? 'border-destructive bg-destructive/10'
                : digit
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
            }`}
            value={digit}
            onChangeText={(value) => handleChange(index, value)}
            onKeyPress={(e) => handleKeyPress(index, e.nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            secureTextEntry
            editable={!disabled}
            selectTextOnFocus
            autoFocus={index === 0}
            accessibilityLabel={t('auth.pinDigit', 'PIN digit {{n}}', { n: index + 1 })}
            accessibilityState={{ disabled: !!disabled }}
            testID={`pin-digit-${index}`}
          />
        ))}
      </View>

      {error && (
        <Text
          className="text-sm text-destructive"
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          testID="pin-error"
        >
          {error}
        </Text>
      )}

      <Pressable
        onPress={reset}
        disabled={disabled}
        accessibilityLabel={t('auth.clearPin', 'Clear')}
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text className="text-sm text-muted-foreground">
          {t('auth.clearPin', 'Clear')}
        </Text>
      </Pressable>
    </View>
  )
}
