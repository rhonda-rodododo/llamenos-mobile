/**
 * Notes screen — paginated list of E2EE encrypted notes with threading (Epic 125).
 * Skeletons on initial load, pull-to-refresh, reply thread expansion.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, RefreshControl, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NoteCard } from '@/components/NoteCard'
import { MessageBubble } from '@/components/MessageBubble'
import { ListSkeleton, NoteCardSkeleton } from '@/components/Skeleton'
import { useAuthStore } from '@/lib/store'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import { encryptMessage } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import { toast } from '@/lib/toast'
import type { EncryptedNote, ConversationMessage } from '@/lib/types'

const PAGE_SIZE = 20

export default function NotesScreen() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const queryClient = useQueryClient()
  const publicKey = useAuthStore(s => s.publicKey)
  const isAdmin = useAuthStore(s => s.isAdmin)
  const [page, setPage] = useState(1)
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'

  // Thread state
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null)
  const [threadReplies, setThreadReplies] = useState<ConversationMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

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

  // --- Thread Handling ---

  const handleReplyPress = useCallback(async (noteId: string) => {
    if (expandedThreadId === noteId) {
      // Collapse
      setExpandedThreadId(null)
      setThreadReplies([])
      setReplyText('')
      return
    }

    // Expand new thread
    setExpandedThreadId(noteId)
    setThreadLoading(true)
    setReplyText('')
    try {
      const res = await apiClient.listNoteReplies(noteId)
      setThreadReplies(res.replies)
    } catch {
      toast.error(t('common.error', 'Something went wrong'))
    } finally {
      setThreadLoading(false)
    }
  }, [expandedThreadId, t])

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || !expandedThreadId || !publicKey) return
    setSendingReply(true)
    try {
      const pk = keyManager.getPublicKeyHex()
      if (!pk) throw new Error('No public key')

      // Build reader pubkeys: self + admin (if different)
      const readerPubkeys = [pk]
      // TODO: get admin decryption pubkey from hub config if available and different
      // For now, the server will add admin envelopes server-side

      const encrypted = encryptMessage(replyText.trim(), readerPubkeys)
      const result = await apiClient.createNoteReply(expandedThreadId, {
        encryptedContent: encrypted.encryptedContent,
        readerEnvelopes: encrypted.readerEnvelopes,
      })

      // Append to local state
      setThreadReplies(prev => [...prev, result.reply])
      setReplyText('')
      haptic.success()

      // Increment replyCount in query cache
      queryClient.setQueryData(['notes', page], (old: { notes: EncryptedNote[]; total: number } | undefined) => {
        if (!old) return old
        return {
          ...old,
          notes: old.notes.map(n =>
            n.id === expandedThreadId ? { ...n, replyCount: (n.replyCount ?? 0) + 1 } : n
          ),
        }
      })
    } catch {
      toast.error(t('common.error', 'Something went wrong'))
    } finally {
      setSendingReply(false)
    }
  }, [replyText, expandedThreadId, publicKey, queryClient, page, t])

  // --- Render ---

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

  const renderItem = ({ item }: { item: EncryptedNote }) => (
    <View className="mb-3">
      <NoteCard note={item} myPubkey={publicKey} onReplyPress={handleReplyPress} />

      {/* Thread section */}
      {expandedThreadId === item.id && (
        <View
          className="ml-4 mt-1 rounded-b-xl border border-t-0 border-border bg-card/50 p-3"
          testID="note-thread"
        >
          {threadLoading ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" />
              <Text className="mt-1 text-xs text-muted-foreground">
                {t('notes.threadLoading', 'Loading thread...')}
              </Text>
            </View>
          ) : (
            <>
              {/* Replies */}
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
  )

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 py-4"
        testID="notes-screen"
        data={notes}
        keyExtractor={item => item.id}
        renderItem={renderItem}
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
    </KeyboardAvoidingView>
  )
}
