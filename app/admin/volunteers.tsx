/**
 * Volunteer management screen — list, add, invite, manage.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, Pressable, Alert, TextInput, RefreshControl, Share } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { generateKeyPair } from '@/lib/crypto'
import { toast } from '@/lib/toast'
import * as apiClient from '@/lib/api-client'
import type { Volunteer } from '@/lib/types'

export default function VolunteersScreen() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canCreate = usePermission('volunteers:create')
  const canDelete = usePermission('volunteers:delete')
  const canInvite = usePermission('invites:create')

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [generatedNsec, setGeneratedNsec] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['volunteers'],
    queryFn: () => apiClient.listVolunteers(),
  })

  const volunteers = data?.volunteers ?? []

  const addMutation = useMutation({
    mutationFn: async (params: { name: string; phone: string }) => {
      const kp = generateKeyPair()
      await apiClient.addVolunteer({
        pubkey: kp.publicKey,
        name: params.name,
        phone: params.phone || undefined,
      })
      return { nsec: kp.nsec, npub: kp.npub }
    },
    onSuccess: (result) => {
      setGeneratedNsec(result.nsec)
      setShowAddForm(false)
      setNewName('')
      setNewPhone('')
      toast.success(t('volunteers.volunteerAdded', 'Volunteer added successfully'))
      queryClient.invalidateQueries({ queryKey: ['volunteers'] })
    },
    onError: () => toast.error(t('admin.addError', 'Failed to add volunteer')),
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const result = await apiClient.createInvite({
        name: '',
        roleIds: ['role-volunteer'],
      })
      return result
    },
    onSuccess: async (result) => {
      const inviteUrl = result.url ?? `llamenos://invite?code=${result.code}`
      toast.success(t('volunteers.inviteCreated', 'Invite created'))
      await Share.share({
        message: t('admin.inviteMessage', 'Join our hotline team: {{url}}', { url: inviteUrl }),
        url: inviteUrl,
      })
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (pubkey: string) => apiClient.deleteVolunteer(pubkey),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      queryClient.invalidateQueries({ queryKey: ['volunteers'] })
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  const handleDelete = useCallback((volunteer: Volunteer) => {
    Alert.alert(
      t('admin.deleteTitle', 'Delete Volunteer'),
      t('admin.deleteMessage', 'Remove {{name}} from the team?', { name: volunteer.name }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('admin.delete', 'Delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(volunteer.pubkey),
        },
      ],
    )
  }, [t, deleteMutation])

  return (
    <View className="flex-1 bg-background" testID="admin-volunteers-screen">
      {/* Generated nsec warning */}
      {generatedNsec && (
        <View className="mx-4 mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <Text className="mb-2 text-sm font-semibold text-yellow-700">
            {t('volunteers.secretKeyWarning', 'This key will only be shown once. Share it securely with the volunteer.')}
          </Text>
          <Text className="font-mono text-xs text-foreground" selectable>
            {generatedNsec}
          </Text>
          <Pressable
            className="mt-2 self-start rounded-lg border border-yellow-500/30 px-3 py-1.5"
            onPress={() => setGeneratedNsec(null)}
          >
            <Text className="text-xs text-yellow-700">{t('common.close', 'Close')}</Text>
          </Pressable>
        </View>
      )}

      {/* Action bar */}
      <View className="flex-row gap-2 px-4 py-3">
        {canCreate && (
          <Pressable
            className="flex-1 rounded-lg bg-primary px-3 py-2.5"
            onPress={() => setShowAddForm(!showAddForm)}
            testID="admin-add-volunteer-btn"
          >
            <Text className="text-center text-sm font-semibold text-primary-foreground">
              {t('volunteers.addVolunteer', 'Add Volunteer')}
            </Text>
          </Pressable>
        )}
        {canInvite && (
          <Pressable
            className="flex-1 rounded-lg border border-border px-3 py-2.5"
            onPress={() => inviteMutation.mutate()}
            disabled={inviteMutation.isPending}
            testID="admin-invite-volunteer-btn"
          >
            <Text className="text-center text-sm font-medium text-foreground">
              {inviteMutation.isPending
                ? t('common.loading', 'Loading...')
                : t('volunteers.inviteVolunteer', 'Invite Volunteer')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Add form */}
      {showAddForm && (
        <View className="mx-4 mb-3 gap-3 rounded-xl border border-border bg-card p-4">
          <TextInput
            className="rounded-lg border border-border px-3 py-2 text-foreground"
            placeholder={t('admin.namePlaceholder', 'Name')}
            value={newName}
            onChangeText={setNewName}
            testID="admin-volunteer-name-input"
          />
          <TextInput
            className="rounded-lg border border-border px-3 py-2 text-foreground"
            placeholder={t('admin.phonePlaceholder', '+1234567890')}
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
          />
          <Pressable
            className="rounded-lg bg-primary px-3 py-2.5"
            onPress={() => addMutation.mutate({ name: newName, phone: newPhone })}
            disabled={addMutation.isPending || !newName.trim()}
            testID="admin-volunteer-create-btn"
          >
            <Text className="text-center text-sm font-semibold text-primary-foreground">
              {addMutation.isPending
                ? t('common.loading', 'Loading...')
                : t('admin.create', 'Create')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Volunteer list */}
      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-4"
        testID="admin-volunteers-list"
        data={volunteers}
        keyExtractor={item => item.pubkey}
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center justify-between rounded-xl border border-border bg-card p-4" testID="admin-volunteer-row">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <View className={`h-2 w-2 rounded-full ${item.active ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                <Text className="text-base font-medium text-foreground">{item.name}</Text>
              </View>
              <View className="mt-1 flex-row flex-wrap gap-1">
                {item.roles.map(role => (
                  <View key={role} className="rounded-full bg-primary/10 px-2 py-0.5">
                    <Text className="text-xs capitalize text-primary">{role}</Text>
                  </View>
                ))}
              </View>
            </View>
            {canDelete && (
              <Pressable
                className="rounded-lg border border-destructive/30 px-3 py-1.5"
                onPress={() => handleDelete(item)}
                disabled={deleteMutation.isPending}
                testID="admin-volunteer-delete-btn"
              >
                <Text className="text-xs text-destructive">{t('admin.remove', 'Remove')}</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View className="items-center py-12" testID="admin-volunteers-empty-state">
            <Text className="text-base text-muted-foreground">
              {t('admin.noVolunteers', 'No volunteers yet')}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
        }
      />
    </View>
  )
}
