/**
 * Decryption wrapper — attempts to decrypt content and shows
 * loading/error/decrypted states.
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
      <View className={`flex-row items-center gap-2 ${className ?? ''}`}>
        <ActivityIndicator size="small" />
        <Text className="text-sm text-muted-foreground">
          {t('notes.decrypting', 'Decrypting...')}
        </Text>
      </View>
    )
  }

  if (error) {
    return (
      <Text className={`text-sm italic text-destructive ${className ?? ''}`}>
        {t('notes.decryptionFailed', 'Unable to decrypt')}
      </Text>
    )
  }

  return (
    <Text className={`text-sm text-foreground ${className ?? ''}`}>
      {text}
      {maxLength && text && text.length >= maxLength ? '...' : ''}
    </Text>
  )
}
