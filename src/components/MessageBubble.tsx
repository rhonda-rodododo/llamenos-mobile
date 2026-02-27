/**
 * Message bubble — inbound (left) or outbound (right) with
 * E2EE decrypted content and status indicator.
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { decryptMessage } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import type { ConversationMessage } from '@/lib/types'

interface MessageBubbleProps {
  message: ConversationMessage
  myPubkey: string | null
  compact?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending: '...',
  sent: '\u2713',
  delivered: '\u2713\u2713',
  read: '\u2713\u2713',
  failed: '!',
}

export function MessageBubble({ message, myPubkey, compact }: MessageBubbleProps) {
  const [text, setText] = useState<string | null>(null)
  const [decryptError, setDecryptError] = useState(false)

  const isOutbound = message.direction === 'outbound'

  const decrypt = useCallback(async () => {
    try {
      const envelopes = message.readerEnvelopes ?? []
      if (!message.encryptedContent || !envelopes.length || !myPubkey) {
        setDecryptError(true)
        return
      }

      const sk = keyManager.getSecretKey()
      const result = decryptMessage(
        message.encryptedContent,
        envelopes,
        sk,
        myPubkey,
      )
      if (result) {
        setText(result)
      } else {
        setDecryptError(true)
      }
    } catch {
      setDecryptError(true)
    }
  }, [message, myPubkey])

  useEffect(() => {
    decrypt()
  }, [decrypt])

  const timeStr = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  const paddingClass = compact ? 'px-2.5 py-1.5' : 'px-3 py-2'

  return (
    <View className={`mb-2 max-w-[85%] ${isOutbound ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-2xl ${paddingClass} ${
          isOutbound
            ? 'rounded-br-md bg-primary'
            : 'rounded-bl-md bg-muted'
        }`}
      >
        {text === null && !decryptError && (
          <ActivityIndicator size="small" color={isOutbound ? '#fff' : '#666'} />
        )}
        {decryptError && (
          <Text className={`text-sm italic ${isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            [Encrypted]
          </Text>
        )}
        {text && (
          <Text className={`text-sm ${isOutbound ? 'text-primary-foreground' : 'text-foreground'}`}>
            {text}
          </Text>
        )}
      </View>
      <View className={`mt-0.5 flex-row items-center gap-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
        <Text className="text-xs text-muted-foreground">{timeStr}</Text>
        {isOutbound && message.status && (
          <Text className={`text-xs ${message.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {STATUS_LABELS[message.status] ?? ''}
          </Text>
        )}
      </View>
    </View>
  )
}
