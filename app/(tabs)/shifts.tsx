/**
 * Shifts screen — view and manage shift schedule (Epic 89 polish).
 * Skeletons on initial load, haptic feedback, a11y labels.
 */

import { useState, useCallback } from 'react'
import { View, Text, FlatList, RefreshControl, Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShiftCard } from '@/components/ShiftCard'
import { ListSkeleton, ShiftCardSkeleton } from '@/components/Skeleton'
import { useAuthStore } from '@/lib/store'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'
import * as apiClient from '@/lib/api-client'

export default function ShiftsScreen() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const publicKey = useAuthStore(s => s.publicKey)
  const queryClient = useQueryClient()
  const [actioningShiftId, setActioningShiftId] = useState<string | null>(null)
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => apiClient.listShifts(),
    enabled: !!publicKey,
  })

  const shifts = data?.shifts ?? []

  const signUpMutation = useMutation({
    mutationFn: (shiftId: string) => apiClient.signUpForShift(shiftId),
    onSuccess: () => {
      haptic.success()
      toast.success(t('shifts.signedUp', 'Signed up for shift'))
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
    onError: () => {
      haptic.error()
      Alert.alert(t('shifts.error', 'Error'), t('shifts.signUpError', 'Failed to sign up for shift'))
    },
    onSettled: () => setActioningShiftId(null),
  })

  const dropMutation = useMutation({
    mutationFn: (shiftId: string) => apiClient.dropShift(shiftId),
    onSuccess: () => {
      toast.info(t('shifts.dropped', 'Shift dropped'))
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
    onError: () => {
      haptic.error()
      Alert.alert(t('shifts.error', 'Error'), t('shifts.dropError', 'Failed to drop shift'))
    },
    onSettled: () => setActioningShiftId(null),
  })

  const handleSignUp = useCallback((shiftId: string) => {
    setActioningShiftId(shiftId)
    signUpMutation.mutate(shiftId)
  }, [signUpMutation])

  const handleDrop = useCallback((shiftId: string) => {
    Alert.alert(
      t('shifts.dropTitle', 'Drop Shift'),
      t('shifts.dropMessage', 'Are you sure you want to drop this shift?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('shifts.drop', 'Drop'),
          style: 'destructive',
          onPress: () => {
            setActioningShiftId(shiftId)
            dropMutation.mutate(shiftId)
          },
        },
      ],
    )
  }, [dropMutation, t])

  if (isLoading) {
    return (
      <View className="flex-1 bg-background px-4 py-4">
        <Text className="mb-4 text-lg font-semibold text-foreground">
          {t('shifts.title', 'Shift Schedule')}
        </Text>
        <ListSkeleton count={4} Card={ShiftCardSkeleton} />
      </View>
    )
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4"
      data={shifts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View className="mb-3">
          <ShiftCard
            shift={item}
            isSignedUp={!!publicKey && item.volunteerPubkeys.includes(publicKey)}
            onSignUp={() => handleSignUp(item.id)}
            onDrop={() => handleDrop(item.id)}
            loading={actioningShiftId === item.id}
          />
        </View>
      )}
      accessibilityLabel={t('shifts.shiftList', 'Shift schedule list')}
      accessibilityRole="list"
      ListEmptyComponent={
        <View className="items-center py-12" accessibilityRole="text">
          <Text className="text-base text-muted-foreground">
            {t('shifts.empty', 'No shifts scheduled')}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {t('shifts.emptyHint', 'An admin will create shifts for the hotline')}
          </Text>
        </View>
      }
      ListHeaderComponent={
        <Text className="mb-4 text-lg font-semibold text-foreground">
          {t('shifts.title', 'Shift Schedule')}
        </Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => { haptic.light(); refetch() }}
          tintColor={colors[scheme].primary}
        />
      }
    />
  )
}
