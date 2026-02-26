/**
 * Note preview card — shows encrypted note with decrypted preview.
 */

import { useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { EncryptedContent } from './EncryptedContent'
import { decryptNoteV2, decryptNote } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import type { EncryptedNote } from '@/lib/types'

interface NoteCardProps {
  note: EncryptedNote
  myPubkey: string | null
}

export function NoteCard({ note, myPubkey }: NoteCardProps) {
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

  return (
    <Pressable
      className="rounded-xl border border-border bg-card p-4"
      onPress={() => router.push(`/note/${note.id}`)}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">
          {dateStr}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {note.callId.slice(0, 8)}...
        </Text>
      </View>

      <EncryptedContent decrypt={decrypt} maxLength={120} />
    </Pressable>
  )
}
