/**
 * Notes screen — paginated list of E2EE encrypted notes (Epic 89 polish).
 * Skeletons on initial load, pull-to-refresh, a11y labels.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery } from '@tanstack/react-query'
import { NoteCard } from '@/components/NoteCard'
import { ListSkeleton, NoteCardSkeleton } from '@/components/Skeleton'
import { useAuthStore } from '@/lib/store'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import * as apiClient from '@/lib/api-client'

const PAGE_SIZE = 20

export default function NotesScreen() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const publicKey = useAuthStore(s => s.publicKey)
  const [page, setPage] = useState(1)
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notes', page],
    queryFn: () => apiClient.listNotes({ page, limit: PAGE_SIZE }),
    enabled: !!publicKey,
  })

  const notes = data?.notes ?? []
  const total = data?.total ?? 0
  const hasMore = notes.length === PAGE_SIZE && page * PAGE_SIZE < total

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage(p => p + 1)
    }
  }, [hasMore, isFetching])

  const onRefresh = useCallback(async () => {
    haptic.light()
    setPage(1)
    await refetch()
  }, [refetch])

  if (isLoading) {
    return (
      <View className="flex-1 bg-background px-4 py-4">
        <Text className="mb-4 text-lg font-semibold text-foreground">
          {t('notes.title', 'Call Notes')}
        </Text>
        <ListSkeleton count={5} Card={NoteCardSkeleton} />
      </View>
    )
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4"
      testID="notes-screen"
      data={notes}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View className="mb-3">
          <NoteCard note={item} myPubkey={publicKey} />
        </View>
      )}
      accessibilityLabel={t('notes.notesList', 'Notes list')}
      accessibilityRole="list"
      ListEmptyComponent={
        <View className="items-center py-12" accessibilityRole="text" testID="notes-empty-state">
          <Text className="text-base text-muted-foreground">
            {t('notes.empty', 'No notes yet')}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {t('notes.emptyHint', 'Notes will appear here after you take calls')}
          </Text>
        </View>
      }
      ListHeaderComponent={
        <Text className="mb-4 text-lg font-semibold text-foreground">
          {total > 0
            ? t('notes.count', '{{count}} notes', { count: total })
            : t('notes.title', 'Call Notes')}
        </Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={isFetching && page === 1}
          onRefresh={onRefresh}
          tintColor={colors[scheme].primary}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetching && page > 1 ? (
          <View className="items-center py-4">
            <ListSkeleton count={2} Card={NoteCardSkeleton} />
          </View>
        ) : null
      }
    />
  )
}
