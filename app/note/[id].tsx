/**
 * Note detail view — full decrypted note content with threading (Epic 125).
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { decryptNoteV2, decryptNote, encryptMessage } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import { MessageBubble } from '@/components/MessageBubble'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'
import type { NotePayload, EncryptedNote, ConversationMessage } from '@/lib/types'

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const queryClient = useQueryClient()
  const publicKey = useAuthStore(s => s.publicKey)
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'
  const [decrypted, setDecrypted] = useState<NotePayload | null>(null)
  const [decryptError, setDecryptError] = useState(false)

  // Thread state
  const [showThread, setShowThread] = useState(false)
  const [threadReplies, setThreadReplies] = useState<ConversationMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // Fetch the note
  const { data, isLoading } = useQuery({
    queryKey: ['notes', 'detail', id],
    queryFn: () => apiClient.listNotes({ limit: 1 }),
    enabled: !!id,
  })

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

  // Thread handling
  const handleToggleThread = useCallback(async () => {
    if (showThread) {
      setShowThread(false)
      return
    }

    if (!id) return
    setShowThread(true)
    setThreadLoading(true)
    try {
      const res = await apiClient.listNoteReplies(id)
      setThreadReplies(res.replies)
    } catch {
      toast.error(t('common.error', 'Something went wrong'))
    } finally {
      setThreadLoading(false)
    }
  }, [showThread, id, t])

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || !id || !publicKey) return
    setSendingReply(true)
    try {
      const pk = keyManager.getPublicKeyHex()
      if (!pk) throw new Error('No public key')

      const encrypted = encryptMessage(replyText.trim(), [pk])
      const result = await apiClient.createNoteReply(id, {
        encryptedContent: encrypted.encryptedContent,
        readerEnvelopes: encrypted.readerEnvelopes,
      })

      setThreadReplies(prev => [...prev, result.reply])
      setReplyText('')
      haptic.success()

      // Invalidate notes list to update reply count
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    } catch {
      toast.error(t('common.error', 'Something went wrong'))
    } finally {
      setSendingReply(false)
    }
  }, [replyText, id, publicKey, queryClient, t])

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

  const replyCount = note.replyCount ?? 0

  return (
    <>
      <Stack.Screen options={{ title: t('notes.detail', 'Note Detail') }} />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={88}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 gap-4"
        >
          {/* Metadata */}
          <View className="rounded-xl border border-border bg-card p-4">
            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-muted-foreground">{t('notes.date', 'Date')}</Text>
                <Text className="text-sm text-foreground">{dateStr}</Text>
              </View>
              {note.callId && (
                <View className="flex-row justify-between">
                  <Text className="text-sm text-muted-foreground">{t('notes.callId', 'Call ID')}</Text>
                  <Text className="font-mono text-xs text-foreground">{note.callId.slice(0, 12)}...</Text>
                </View>
              )}
              {note.conversationId && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-muted-foreground">{t('notes.linkedTo', 'Linked to')}</Text>
                  <View className="rounded-full bg-primary/10 px-2 py-0.5">
                    <Text className="text-xs font-medium text-primary">
                      {t('notes.conversationNote', 'Conversation')}
                    </Text>
                  </View>
                </View>
              )}
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

          {/* Thread section */}
          <View className="rounded-xl border border-border bg-card p-4">
            <Pressable
              className="flex-row items-center justify-between"
              onPress={handleToggleThread}
              testID="note-reply-btn"
            >
              <Text className="text-sm font-medium text-foreground">
                {t('notes.reply', 'Reply')}
              </Text>
              <Text className="text-xs text-primary">
                {replyCount > 0
                  ? t('notes.repliesCount', '{{count}} replies', { count: replyCount })
                  : t('notes.reply', 'Reply')}
              </Text>
            </Pressable>

            {showThread && (
              <View className="mt-3 border-t border-border pt-3" testID="note-thread">
                {threadLoading ? (
                  <View className="items-center py-4">
                    <ActivityIndicator size="small" />
                  </View>
                ) : (
                  <>
                    {threadReplies.map(reply => (
                      <MessageBubble
                        key={reply.id}
                        message={reply}
                        myPubkey={publicKey}
                        compact
                      />
                    ))}

                    {threadReplies.length === 0 && (
                      <Text className="py-2 text-center text-xs text-muted-foreground">
                        {t('notes.noReplies', 'No replies yet')}
                      </Text>
                    )}

                    {/* Reply composer */}
                    <View className="mt-2 flex-row items-end gap-2">
                      <TextInput
                        className="min-h-[36px] max-h-[80px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        placeholder={t('notes.replyPlaceholder', 'Write a reply...')}
                        placeholderTextColor={colors[scheme].mutedForeground}
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                        testID="note-reply-input"
                      />
                      <Pressable
                        className={`rounded-lg px-3 py-2 ${replyText.trim() ? 'bg-primary' : 'bg-muted'}`}
                        onPress={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        testID="note-reply-send"
                      >
                        {sendingReply ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text className={`text-sm font-semibold ${replyText.trim() ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                            {t('notes.sendReply', 'Send')}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}
