/**
 * Ban management screen — view, add, and remove phone number bans.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, Pressable, Alert, TextInput, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import * as apiClient from '@/lib/api-client'

export default function BansScreen() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const queryClient = useQueryClient()
  const canCreate = usePermission('bans:create')
  const canDelete = usePermission('bans:delete')
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'

  const [showAddForm, setShowAddForm] = useState(false)
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bans'],
    queryFn: () => apiClient.listBans(),
  })

  const bans = data?.bans ?? []

  const addMutation = useMutation({
    mutationFn: (params: { phoneHash: string; reason?: string }) => apiClient.addBan(params),
    onSuccess: () => {
      setPhone('')
      setReason('')
      setShowAddForm(false)
      queryClient.invalidateQueries({ queryKey: ['bans'] })
    },
    onError: () => Alert.alert(t('admin.error', 'Error'), t('bans.addError', 'Failed to add ban')),
  })

  const removeMutation = useMutation({
    mutationFn: (banId: string) => apiClient.removeBan(banId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bans'] }),
    onError: () => Alert.alert(t('admin.error', 'Error'), t('bans.removeError', 'Failed to remove ban')),
  })

  const handleRemove = useCallback((banId: string) => {
    Alert.alert(
      t('bans.removeTitle', 'Remove Ban'),
      t('bans.removeMessage', 'Remove this number from the ban list?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('bans.remove', 'Remove'),
          style: 'destructive',
          onPress: () => removeMutation.mutate(banId),
        },
      ],
    )
  }, [removeMutation, t])

  return (
    <View className="flex-1 bg-background">
      {/* Action bar */}
      {canCreate && (
        <View className="px-4 py-3">
          <Pressable
            className="rounded-lg bg-primary px-3 py-2.5"
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Text className="text-center text-sm font-semibold text-primary-foreground">
              {t('bans.addBan', 'Ban Number')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Add form */}
      {showAddForm && (
        <View className="mx-4 mb-3 gap-3 rounded-xl border border-border bg-card p-4">
          <TextInput
            className="rounded-lg border border-border px-3 py-2 text-foreground"
            placeholder={t('bans.phonePlaceholder', 'Phone number (E.164)')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TextInput
            className="rounded-lg border border-border px-3 py-2 text-foreground"
            placeholder={t('bans.reasonPlaceholder', 'Reason (optional)')}
            value={reason}
            onChangeText={setReason}
          />
          <Pressable
            className="rounded-lg bg-destructive px-3 py-2.5"
            onPress={() => addMutation.mutate({ phoneHash: phone, reason: reason || undefined })}
            disabled={addMutation.isPending || !phone.trim()}
          >
            <Text className="text-center text-sm font-semibold text-white">
              {t('bans.ban', 'Ban')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Ban list */}
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-4"
        data={bans}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
            <View className="flex-1">
              <Text className="font-mono text-sm text-foreground">{item.phoneHash}</Text>
              {item.reason && (
                <Text className="mt-1 text-xs text-muted-foreground">{item.reason}</Text>
              )}
              <Text className="mt-1 text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {canDelete && (
              <Pressable
                className="rounded-lg border border-destructive/30 px-3 py-1.5"
                onPress={() => handleRemove(item.id)}
              >
                <Text className="text-xs text-destructive">{t('bans.remove', 'Remove')}</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-base text-muted-foreground">
              {t('bans.empty', 'No banned numbers')}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { haptic.light(); refetch() }}
            tintColor={colors[scheme].primary}
          />
        }
      />
    </View>
  )
}
