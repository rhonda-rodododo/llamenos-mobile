/**
 * Contact timeline detail — unified view of a caller's notes and conversations (Epic 126).
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { ChannelBadge } from '@/components/ChannelBadge'
import { decryptNoteV2, decryptNote } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import type { EncryptedNote, Conversation } from '@/lib/types'

export default function ContactTimelineScreen() {
  const { hash } = useLocalSearchParams<{ hash: string }>()
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)
  const isAdmin = useAuthStore(s => s.isAdmin)
  const [decryptedNotes, setDecryptedNotes] = useState<Map<string, string>>(new Map())

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', hash, 'timeline'],
    queryFn: () => apiClient.getContactTimeline(hash!),
    enabled: !!hash,
  })

  const notes = data?.notes ?? []
  const conversations = data?.conversations ?? []

  // Decrypt notes
  useEffect(() => {
    if (!notes.length || !publicKey) return

    async function decryptAll() {
      const sk = keyManager.getSecretKey()
      const map = new Map<string, string>()

      for (const note of notes) {
        try {
          // Admin envelope
          if (isAdmin && note.adminEnvelopes?.length) {
            const envelope = note.adminEnvelopes.find(e => e.pubkey === publicKey) ?? note.adminEnvelopes[0]
            if (envelope) {
              const payload = decryptNoteV2(note.encryptedContent, envelope, sk)
              if (payload) {
                map.set(note.id, payload.text)
                continue
              }
            }
          }

          // Author envelope
          if (note.authorEnvelope && note.authorPubkey === publicKey) {
            const payload = decryptNoteV2(note.encryptedContent, note.authorEnvelope, sk)
            if (payload) {
              map.set(note.id, payload.text)
              continue
            }
          }

          // V1 fallback
          const payload = decryptNote(note.encryptedContent, sk)
          if (payload) {
            map.set(note.id, payload.text)
          }
        } catch {
          // Decryption failed for this note
        }
      }

      setDecryptedNotes(map)
    }

    decryptAll()
  }, [notes, publicKey, isAdmin])

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: t('contacts.contact', 'Contact') }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('contacts.contact', 'Contact'),
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 py-4 gap-4"
        testID="contact-timeline"
      >
        {/* Notes section */}
        {notes.length > 0 && (
          <View className="rounded-xl border border-border bg-card">
            <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
              <Text className="text-sm font-semibold text-foreground">
                {t('notes.title', 'Notes')}
              </Text>
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-xs font-medium text-primary">{notes.length}</Text>
              </View>
            </View>
            {notes.map((note: EncryptedNote) => (
              <View key={note.id} className="border-b border-border px-4 py-3 last:border-b-0">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString()}
                  </Text>
                  {note.callId && (
                    <View className="rounded-full bg-muted px-1.5 py-0.5">
                      <Text className="text-[10px] text-muted-foreground">
                        {t('contacts.call', 'Call')}
                      </Text>
                    </View>
                  )}
                  {note.conversationId && (
                    <View className="rounded-full bg-primary/10 px-1.5 py-0.5">
                      <Text className="text-[10px] text-primary">
                        {t('contacts.conversation', 'Conversation')}
                      </Text>
                    </View>
                  )}
                  {(note.replyCount ?? 0) > 0 && (
                    <View className="rounded-full bg-muted px-1.5 py-0.5">
                      <Text className="text-[10px] text-muted-foreground">
                        {t('notes.repliesCount', '{{count}} replies', { count: note.replyCount })}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="mt-1 text-sm text-foreground" numberOfLines={3}>
                  {decryptedNotes.get(note.id) || t('conversations.encrypted', '[Encrypted]')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Conversations section */}
        {conversations.length > 0 && (
          <View className="rounded-xl border border-border bg-card">
            <View className="flex-row items-center gap-2 border-b border-border px-4 py-3">
              <Text className="text-sm font-semibold text-foreground">
                {t('conversations.title', 'Conversations')}
              </Text>
              <View className="rounded-full bg-primary/10 px-2 py-0.5">
                <Text className="text-xs font-medium text-primary">{conversations.length}</Text>
              </View>
            </View>
            {conversations.map((conv: Conversation) => (
              <View key={conv.id} className="flex-row items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <ChannelBadge channelType={conv.channelType} />
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-medium text-foreground">
                      {conv.metadata?.type === 'report'
                        ? t('contacts.report', 'Report')
                        : t('contacts.conversation', 'Conversation')}
                    </Text>
                    <View className={`rounded-full px-1.5 py-0.5 ${
                      conv.status === 'active' ? 'bg-green-500/10' :
                      conv.status === 'waiting' ? 'bg-yellow-500/10' : 'bg-muted'
                    }`}>
                      <Text className={`text-[10px] font-medium ${
                        conv.status === 'active' ? 'text-green-600' :
                        conv.status === 'waiting' ? 'text-yellow-600' : 'text-muted-foreground'
                      }`}>
                        {conv.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {conv.messageCount ?? 0} {t('contacts.messages', 'messages')}
                    {conv.lastMessageAt && ` · ${new Date(conv.lastMessageAt).toLocaleDateString()}`}
                  </Text>
                </View>
                {conv.metadata?.reportCategory && (
                  <View className="rounded-full bg-muted px-2 py-0.5">
                    <Text className="text-[10px] text-muted-foreground">{conv.metadata.reportCategory}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {notes.length === 0 && conversations.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-base text-muted-foreground">
              {t('contacts.noHistory', 'No interaction history found')}
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  )
}
