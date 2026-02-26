/**
 * Note detail view — full decrypted note content.
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { decryptNoteV2, decryptNote } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import type { NotePayload, EncryptedNote } from '@/lib/types'

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)
  const [decrypted, setDecrypted] = useState<NotePayload | null>(null)
  const [decryptError, setDecryptError] = useState(false)

  // Fetch the note (we fetch a page with the specific note)
  const { data, isLoading } = useQuery({
    queryKey: ['notes', 'detail', id],
    queryFn: () => apiClient.listNotes({ limit: 1 }),
    enabled: !!id,
  })

  // For now, use the note from the notes list query cache if available
  const note = data?.notes?.find((n: EncryptedNote) => n.id === id) ?? null

  const decryptNote_ = useCallback(async (note: EncryptedNote) => {
    try {
      const sk = keyManager.getSecretKey()

      // V2 — author's envelope
      if (note.authorEnvelope && note.authorPubkey === publicKey) {
        const payload = decryptNoteV2(note.encryptedContent, note.authorEnvelope, sk)
        if (payload) {
          setDecrypted(payload)
          return
        }
      }

      // V2 — admin envelope
      if (note.adminEnvelopes?.length && publicKey) {
        const myEnvelope = note.adminEnvelopes.find(e => e.pubkey === publicKey)
        if (myEnvelope) {
          const payload = decryptNoteV2(note.encryptedContent, myEnvelope, sk)
          if (payload) {
            setDecrypted(payload)
            return
          }
        }
      }

      // V1 fallback
      const payload = decryptNote(note.encryptedContent, sk)
      if (payload) {
        setDecrypted(payload)
        return
      }

      setDecryptError(true)
    } catch {
      setDecryptError(true)
    }
  }, [publicKey])

  useEffect(() => {
    if (note) decryptNote_(note)
  }, [note, decryptNote_])

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!note) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-muted-foreground">
          {t('notes.notFound', 'Note not found')}
        </Text>
      </View>
    )
  }

  const dateStr = new Date(note.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <>
      <Stack.Screen options={{ title: t('notes.detail', 'Note Detail') }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 py-4 gap-4"
      >
        {/* Metadata */}
        <View className="rounded-xl border border-border bg-card p-4">
          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted-foreground">{t('notes.date', 'Date')}</Text>
              <Text className="text-sm text-foreground">{dateStr}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted-foreground">{t('notes.callId', 'Call ID')}</Text>
              <Text className="font-mono text-xs text-foreground">{note.callId.slice(0, 12)}...</Text>
            </View>
          </View>
        </View>

        {/* Decrypted content */}
        <View className="rounded-xl border border-border bg-card p-4">
          <Text className="mb-2 text-sm font-medium text-muted-foreground">
            {t('notes.content', 'Note Content')}
          </Text>

          {!decrypted && !decryptError && (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" />
              <Text className="text-sm text-muted-foreground">
                {t('notes.decrypting', 'Decrypting...')}
              </Text>
            </View>
          )}

          {decryptError && (
            <Text className="italic text-destructive">
              {t('notes.decryptionFailed', 'Unable to decrypt this note')}
            </Text>
          )}

          {decrypted && (
            <Text className="text-base leading-6 text-foreground" selectable>
              {decrypted.text}
            </Text>
          )}
        </View>

        {/* Custom fields */}
        {decrypted?.fields && Object.keys(decrypted.fields).length > 0 && (
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="mb-2 text-sm font-medium text-muted-foreground">
              {t('notes.fields', 'Custom Fields')}
            </Text>
            {Object.entries(decrypted.fields).map(([key, value]) => (
              <View key={key} className="flex-row justify-between py-1">
                <Text className="text-sm text-muted-foreground">{key}</Text>
                <Text className="text-sm text-foreground">{String(value)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  )
}
