/**
 * Conversations tab — list of messaging conversations.
 * Grouped by status: waiting (yellow) and active (green).
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNostrSubscription } from '@/lib/nostr/hooks'
import { KIND_MESSAGE_NEW, KIND_CONVERSATION_ASSIGNED } from '@/lib/nostr/event-kinds'
import { ChannelBadge } from '@/components/ChannelBadge'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import * as apiClient from '@/lib/api-client'
import type { Conversation } from '@/lib/types'

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function ConversationRow({ item, onPress }: { item: Conversation; onPress: () => void }) {
  const isWaiting = item.status === 'waiting'

  return (
    <Pressable className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4" onPress={onPress}>
      <View className={`h-3 w-3 rounded-full ${isWaiting ? 'bg-yellow-500' : 'bg-green-500'}`} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <ChannelBadge channelType={item.channelType} />
          <Text className="text-sm text-muted-foreground">
            ...{item.contactIdentifier.slice(-4)}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center gap-2">
          <Text className="text-xs text-muted-foreground">
            {item.assignedTo ? `${item.assignedTo.slice(0, 8)}...` : 'Waiting'}
          </Text>
          {item.lastMessageAt && (
            <Text className="text-xs text-muted-foreground">
              {relativeTime(item.lastMessageAt)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  )
}

export default function ConversationsScreen() {
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)
  const hubId = useHubConfigStore(s => s.hubUrl)
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => apiClient.listConversations(),
    enabled: !!publicKey,
  })

  const conversations = data?.conversations ?? []
  const waiting = conversations.filter(c => c.status === 'waiting')
  const active = conversations.filter(c => c.status === 'active')

  // Real-time updates via Nostr
  useNostrSubscription(
    hubId ?? undefined,
    [KIND_MESSAGE_NEW, KIND_CONVERSATION_ASSIGNED],
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }, [queryClient]),
  )

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  const sections = [
    ...(waiting.length > 0 ? [{ title: t('conversations.waiting', 'Waiting'), data: waiting }] : []),
    ...(active.length > 0 ? [{ title: t('conversations.active', 'Active'), data: active }] : []),
  ]

  return (
    <FlatList<Conversation>
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4"
      data={[...waiting, ...active]}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => {
        const isFirstWaiting = index === 0 && waiting.length > 0
        const isFirstActive = index === waiting.length && active.length > 0

        return (
          <View className="mb-2">
            {isFirstWaiting && (
              <Text className="mb-2 text-xs font-semibold uppercase text-yellow-600">
                {t('conversations.waiting', 'Waiting')}
              </Text>
            )}
            {isFirstActive && (
              <Text className="mb-2 mt-2 text-xs font-semibold uppercase text-green-600">
                {t('conversations.active', 'Active')}
              </Text>
            )}
            <ConversationRow
              item={item}
              onPress={() => router.push(`/conversation/${item.id}`)}
            />
          </View>
        )
      }}
      ListEmptyComponent={
        <View className="items-center py-12">
          <Text className="text-base text-muted-foreground">
            {t('conversations.empty', 'No conversations')}
          </Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
      }
    />
  )
}
