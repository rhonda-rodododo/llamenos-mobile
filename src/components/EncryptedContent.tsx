/**
 * Decryption wrapper — attempts to decrypt content and shows
 * loading/error/decrypted states (Epic 89 a11y).
 */

import { useState, useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'

interface EncryptedContentProps {
  decrypt: () => Promise<string | null>
  /** Maximum characters to show (for preview cards) */
  maxLength?: number
  className?: string
}

export function EncryptedContent({ decrypt, maxLength, className }: EncryptedContentProps) {
  const { t } = useTranslation()
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    decrypt()
      .then(result => {
        if (cancelled) return
        if (result) {
          setText(maxLength ? result.slice(0, maxLength) : result)
        } else {
          setError(true)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [decrypt, maxLength])

  if (loading) {
    return (
      <View
        className={`flex-row items-center gap-2 ${className ?? ''}`}
        accessibilityLabel={t('notes.decrypting', 'Decrypting...')}
        accessibilityRole="progressbar"
      >
        <ActivityIndicator size="small" />
        <Text className="text-sm text-muted-foreground">
          {t('notes.decrypting', 'Decrypting...')}
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <Text
        className={`text-sm italic text-destructive ${className ?? ''}`}
        accessibilityLabel={t('notes.decryptionFailed', 'Unable to decrypt')}
        accessibilityRole="alert"
      >
        {t('notes.decryptionFailed', 'Unable to decrypt')}
      </Text>
    )
  }

  const displayText = text
    ? maxLength && text.length >= maxLength
      ? `${text}...`
      : text
    : ''

  return (
    <Text
      className={`text-sm text-foreground ${className ?? ''}`}
      accessibilityLabel={displayText}
    >
      {displayText}
    </Text>
  )
}
