/**
 * Admin contacts list — paginated list of all callers with interaction badges (Epic 126).
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native'
import { Stack, router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery } from '@tanstack/react-query'
import { ListSkeleton } from '@/components/Skeleton'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'
import * as apiClient from '@/lib/api-client'
import type { ContactSummary } from '@/lib/types'

const PAGE_SIZE = 50

function ContactRow({ contact, onPress }: { contact: ContactSummary; onPress: (hash: string) => void }) {
  const { t } = useTranslation()

  return (
    <Pressable
      className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3.5"
      onPress={() => { haptic.light(); onPress(contact.contactHash) }}
      accessibilityRole="button"
      accessibilityLabel={contact.last4 ? `Contact ***-${contact.last4}` : 'Contact'}
      testID="contact-row"
    >
      {/* Contact icon */}
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Text className="text-sm font-semibold text-primary">
          {contact.last4 ? contact.last4.slice(-2) : '#'}
        </Text>
      </View>

      {/* Info */}
      <View className="flex-1 min-w-0">
        <Text className="font-medium text-foreground">
          {contact.last4 ? `***-${contact.last4}` : contact.contactHash.slice(0, 12) + '...'}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {t('contacts.lastSeen', 'Last seen')}: {new Date(contact.lastSeen).toLocaleDateString()}
        </Text>
      </View>

      {/* Badges */}
      <View className="flex-row gap-1.5">
        {contact.noteCount > 0 && (
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text className="text-[10px] font-medium text-muted-foreground">
              {contact.noteCount} {t('notes.title', 'Notes').toLowerCase()}
            </Text>
          </View>
        )}
        {contact.conversationCount > 0 && (
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text className="text-[10px] font-medium text-muted-foreground">
              {contact.conversationCount} {t('contacts.messages', 'msgs')}
            </Text>
          </View>
        )}
        {contact.reportCount > 0 && (
          <View className="rounded-full bg-destructive/10 px-2 py-0.5">
            <Text className="text-[10px] font-medium text-destructive">
              {contact.reportCount} {t('contacts.report', 'report')}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

export default function ContactsScreen() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contacts', page],
    queryFn: () => apiClient.listContacts({ page, limit: PAGE_SIZE }),
  })

  const contacts = data?.contacts ?? []
  const total = data?.total ?? 0
  const hasMore = contacts.length === PAGE_SIZE && page * PAGE_SIZE < total

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

  const handleContactPress = useCallback((hash: string) => {
    router.push(`/admin/contact/${hash}` as never)
  }, [])

  return (
    <>
      <Stack.Screen options={{ title: t('contacts.title', 'Contacts') }} />
      {isLoading ? (
        <View className="flex-1 bg-background px-4 py-4">
          <ListSkeleton count={8} />
        </View>
      ) : (
        <FlatList
          className="flex-1 bg-background"
          data={contacts}
          keyExtractor={item => item.contactHash}
          renderItem={({ item }) => (
            <ContactRow contact={item} onPress={handleContactPress} />
          )}
          testID="contacts-list"
          ListHeaderComponent={
            <View className="px-4 py-3">
              <Text className="text-sm text-muted-foreground">
                {t('contacts.description', 'View unified interaction history across calls, conversations, and reports.')}
              </Text>
              {total > 0 && (
                <Text className="mt-1 text-xs text-muted-foreground">
                  {total} {t('contacts.title', 'contacts').toLowerCase()}
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-base text-muted-foreground">
                {t('contacts.noContacts', 'No contacts found')}
              </Text>
            </View>
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
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
        />
      )}
    </>
  )
}
