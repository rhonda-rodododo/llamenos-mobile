/**
 * Note preview card — shows encrypted note with decrypted preview.
 * Includes reply button for note threading (Epic 125).
 */

import { useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { EncryptedContent } from './EncryptedContent'
import { decryptNoteV2, decryptNote } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import type { EncryptedNote } from '@/lib/types'

interface NoteCardProps {
  note: EncryptedNote
  myPubkey: string | null
  onReplyPress?: (noteId: string) => void
}

export function NoteCard({ note, myPubkey, onReplyPress }: NoteCardProps) {
  const { t } = useTranslation()
  const dateStr = new Date(note.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const decrypt = useCallback(async () => {
    try {
      const sk = keyManager.getSecretKey()

      // Try V2 decryption (ECIES envelope)
      if (note.authorEnvelope && note.authorPubkey === myPubkey) {
        const payload = decryptNoteV2(
          note.encryptedContent,
          note.authorEnvelope,
          sk,
        )
        return payload?.text ?? null
      }

      // Try admin envelope
      if (note.adminEnvelopes?.length && myPubkey) {
        const myEnvelope = note.adminEnvelopes.find(e => e.pubkey === myPubkey)
        if (myEnvelope) {
          const payload = decryptNoteV2(note.encryptedContent, myEnvelope, sk)
          return payload?.text ?? null
        }
      }

      // Fallback to V1
      const payload = decryptNote(note.encryptedContent, sk)
      return payload?.text ?? null
    } catch {
      return null
    }
  }, [note, myPubkey])

  // Display identifier: callId, conversationId, or neither
  const identifierText = note.callId
    ? note.callId.slice(0, 8) + '...'
    : note.conversationId
      ? note.conversationId.slice(0, 8) + '...'
      : null

  return (
    <Pressable
      className="rounded-xl border border-border bg-card p-4"
      onPress={() => router.push(`/note/${note.id}`)}
      accessibilityLabel={t('notes.noteFrom', 'Note from {{date}}', { date: dateStr })}
      accessibilityRole="button"
      accessibilityHint={t('a11y.openNote', 'Opens note details')}
      testID="note-card"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-muted-foreground">
            {dateStr}
          </Text>
          {note.conversationId && (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-primary">
                {t('notes.conversationNote', 'Conversation')}
              </Text>
            </View>
          )}
        </View>
        {identifierText && (
          <Text className="text-xs text-muted-foreground">
            {identifierText}
          </Text>
        )}
      </View>

      <EncryptedContent decrypt={decrypt} maxLength={120} />

      {/* Reply button */}
      {onReplyPress && (
        <Pressable
          className="mt-2 self-start"
          onPress={(e) => {
            e.stopPropagation?.()
            onReplyPress(note.id)
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={
            (note.replyCount ?? 0) > 0
              ? t('notes.repliesCount', '{{count}} replies', { count: note.replyCount })
              : t('notes.reply', 'Reply')
          }
          testID="note-reply-btn"
        >
          <Text className="text-xs font-medium text-primary">
            {(note.replyCount ?? 0) > 0
              ? t('notes.repliesCount', '{{count}} replies', { count: note.replyCount })
              : t('notes.reply', 'Reply')}
          </Text>
        </Pressable>
      )}
    </Pressable>
  )
}
