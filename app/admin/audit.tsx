/**
 * Audit log screen — paginated, filterable event log.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import * as apiClient from '@/lib/api-client'

const EVENT_FILTERS = ['all', 'authentication', 'volunteers', 'calls', 'settings', 'shifts', 'notes'] as const
type EventFilter = typeof EVENT_FILTERS[number]

const CATEGORY_COLORS: Record<string, string> = {
  authentication: 'bg-blue-100 text-blue-800',
  volunteers: 'bg-purple-100 text-purple-800',
  calls: 'bg-green-100 text-green-800',
  settings: 'bg-amber-100 text-amber-800',
  shifts: 'bg-cyan-100 text-cyan-800',
  notes: 'bg-pink-100 text-pink-800',
}

function getEventCategory(event: string): string {
  if (event.startsWith('auth.') || event.startsWith('login') || event.startsWith('session')) return 'authentication'
  if (event.startsWith('volunteer')) return 'volunteers'
  if (event.startsWith('call')) return 'calls'
  if (event.startsWith('setting') || event.startsWith('config')) return 'settings'
  if (event.startsWith('shift')) return 'shifts'
  if (event.startsWith('note')) return 'notes'
  return 'other'
}

export default function AuditScreen() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<EventFilter>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit', filter, page],
    queryFn: () => apiClient.getAuditLog({
      page,
      limit: 50,
      action: filter === 'all' ? undefined : filter,
    }),
  })

  const entries = data?.entries ?? []
  const total = data?.total ?? 0
  const hasMore = entries.length === 50 && page * 50 < total

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) setPage(p => p + 1)
  }, [hasMore, isFetching])

  return (
    <View className="flex-1 bg-background">
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 py-3 gap-2"
      >
        {EVENT_FILTERS.map(f => (
          <Pressable
            key={f}
            className={`rounded-full px-3 py-1.5 ${
              filter === f ? 'bg-primary' : 'border border-border'
            }`}
            onPress={() => { setFilter(f); setPage(1) }}
          >
            <Text className={`text-xs font-medium capitalize ${
              filter === f ? 'text-primary-foreground' : 'text-foreground'
            }`}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Audit entries */}
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-4"
        data={entries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const category = getEventCategory(item.action)
          const colorClass = CATEGORY_COLORS[category] ?? 'bg-gray-100 text-gray-800'

          return (
            <View className="mb-2 rounded-xl border border-border bg-card p-3">
              <View className="flex-row items-center gap-2">
                <View className={`rounded-full px-2 py-0.5 ${colorClass.split(' ')[0]}`}>
                  <Text className={`text-xs font-medium ${colorClass.split(' ')[1]}`}>
                    {item.action}
                  </Text>
                </View>
                <Text className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text className="mt-1 font-mono text-xs text-muted-foreground">
                {item.actorPubkey === 'system' ? 'system' : `${item.actorPubkey.slice(0, 12)}...`}
              </Text>
              {item.details && (
                <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={2}>
                  {item.details}
                </Text>
              )}
            </View>
          )
        }}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" />
            </View>
          ) : (
            <View className="items-center py-12">
              <Text className="text-base text-muted-foreground">
                {t('audit.empty', 'No audit entries')}
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={isFetching && page === 1} onRefresh={() => { setPage(1); refetch() }} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetching && page > 1 ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
      />
    </View>
  )
}
