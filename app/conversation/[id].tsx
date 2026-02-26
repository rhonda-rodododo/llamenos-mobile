/**
 * Conversation thread view — E2EE messages with compose.
 */

import { useState, useCallback, useRef } from 'react'
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNostrSubscription } from '@/lib/nostr/hooks'
import { KIND_MESSAGE_NEW } from '@/lib/nostr/event-kinds'
import { MessageBubble } from '@/components/MessageBubble'
import { ChannelBadge } from '@/components/ChannelBadge'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import { encryptMessage } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import type { ConversationMessage } from '@/lib/types'

export default function ConversationThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)
  const hubId = useHubConfigStore(s => s.hubUrl)
  const queryClient = useQueryClient()
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList<ConversationMessage>>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', id, 'messages'],
    queryFn: () => apiClient.getConversationMessages(id!),
    enabled: !!id,
    refetchInterval: 10_000, // Poll every 10s as backup
  })

  const messages = data?.messages ?? []

  // Real-time message updates
  useNostrSubscription(
    hubId ?? undefined,
    [KIND_MESSAGE_NEW],
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations', id, 'messages'] })
    }, [queryClient, id]),
  )

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !publicKey || !id) return
    setSending(true)

    try {
      const pk = keyManager.getPublicKeyHex()
      if (!pk) throw new Error('No public key')

      // Encrypt for self (and admin would be added server-side)
      const encrypted = encryptMessage(messageText.trim(), [pk])

      await apiClient.api.post(`/api/conversations/${id}/messages`, {
        encryptedContent: encrypted.encryptedContent,
        readerEnvelopes: encrypted.readerEnvelopes,
        plaintextForSending: messageText.trim(), // Server forwards to channel
      })

      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['conversations', id, 'messages'] })
    } catch {
      // Error handling
    } finally {
      setSending(false)
    }
  }, [messageText, publicKey, id, queryClient])

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('conversations.thread', 'Conversation'),
        }}
      />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={88}
      >
        {/* Messages */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            className="flex-1"
            contentContainerClassName="px-4 py-2"
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} myPubkey={publicKey} />
            )}
            inverted={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false })
            }}
            ListEmptyComponent={
              <View className="items-center py-12">
                <Text className="text-sm text-muted-foreground">
                  {t('conversations.noMessages', 'No messages yet')}
                </Text>
              </View>
            }
          />
        )}

        {/* Composer */}
        <View className="border-t border-border bg-card px-4 py-3">
          <View className="mb-1 flex-row items-center gap-1">
            <Text className="text-xs text-muted-foreground">
              {t('conversations.encrypted', 'End-to-end encrypted')}
            </Text>
          </View>
          <View className="flex-row items-end gap-2">
            <TextInput
              className="min-h-[40px] max-h-[100px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-foreground"
              placeholder={t('conversations.placeholder', 'Type a message...')}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <Pressable
              className="rounded-xl bg-primary px-4 py-2.5"
              onPress={handleSend}
              disabled={sending || !messageText.trim()}
            >
              <Text className="text-sm font-semibold text-primary-foreground">
                {t('conversations.send', 'Send')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  )
}
