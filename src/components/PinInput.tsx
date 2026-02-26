/**
 * PIN entry component with individual digit inputs.
 * Supports 4-6 digit PINs with auto-advance.
 */

import { useRef, useState, useCallback } from 'react'
import { View, TextInput, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'

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
      // Only allow digits
      const digit = value.replace(/\D/g, '').slice(-1)
      const newDigits = [...digits]
      newDigits[index] = digit
      setDigits(newDigits)

      if (digit && index < length - 1) {
        // Auto-advance to next input
        inputRefs.current[index + 1]?.focus()
      }

      // Check if all digits are entered
      if (digit && newDigits.every(d => d !== '')) {
        onComplete(newDigits.join(''))
      }
    },
    [digits, disabled, length, onComplete],
  )

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !digits[index] && index > 0) {
        // Move back on backspace when current is empty
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
    <View className="items-center gap-4">
      <View className="flex-row gap-3">
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref }}
            className={`h-14 w-12 rounded-xl border-2 text-center text-2xl font-bold ${
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
          />
        ))}
      </View>

      {error && (
        <Text className="text-sm text-destructive">{error}</Text>
      )}

      <Pressable onPress={reset} disabled={disabled}>
        <Text className="text-sm text-muted-foreground">
          {t('auth.clearPin', 'Clear')}
        </Text>
      </Pressable>
    </View>
  )
}
