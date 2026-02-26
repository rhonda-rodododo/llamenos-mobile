/**
 * Dashboard — main screen after authentication (Epic 89 polish).
 * Shows shift status, active calls, today's stats, and relay status.
 * Haptic feedback, a11y labels, theme-aware refresh.
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import { useCalls, useShiftStatus, usePresence } from '@/lib/hooks'
import { CallCard } from '@/components/CallCard'
import { RelayStatus } from '@/components/RelayStatus'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import * as apiClient from '@/lib/api-client'

export default function DashboardScreen() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const publicKey = useAuthStore(s => s.publicKey)
  const isAdmin = useAuthStore(s => s.isAdmin)
  const hubName = useHubConfigStore(s => s.hubName)
  const hubId = useHubConfigStore(s => s.hubUrl)
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'

  const { ringingCalls, currentCall, answerCall, hangupCall, reportSpam } = useCalls(hubId ?? undefined, publicKey)
  const { onShift, currentShift, nextShift, loading: shiftLoading, refetch: refetchShift } = useShiftStatus()
  const { hasAvailable } = usePresence(hubId ?? undefined)
  const [todayCount, setTodayCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [onBreak, setOnBreak] = useState(false)

  const fetchTodayCount = useCallback(async () => {
    try {
      const { count } = await apiClient.getCallsTodayCount()
      setTodayCount(count)
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchTodayCount()
    const interval = setInterval(fetchTodayCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchTodayCount])

  const onRefresh = useCallback(async () => {
    haptic.light()
    setRefreshing(true)
    await Promise.all([refetchShift(), fetchTodayCount()])
    setRefreshing(false)
  }, [refetchShift, fetchTodayCount])

  const toggleBreak = useCallback(async () => {
    haptic.medium()
    const newBreak = !onBreak
    setOnBreak(newBreak)
    try {
      await apiClient.updateMyAvailability({ onBreak: newBreak })
    } catch {
      setOnBreak(!newBreak)
    }
  }, [onBreak])

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-4"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors[scheme].primary}
        />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Text
          className="text-2xl font-bold text-foreground"
          accessibilityRole="header"
        >
          {hubName ?? t('app.name', 'Hotline')}
        </Text>
        <RelayStatus />
      </View>

      {/* Shift status */}
      <View
        className="rounded-xl border border-border bg-card p-4"
        accessibilityLabel={`${t('dashboard.shiftStatus', 'Shift Status')}: ${
          onShift
            ? onBreak ? t('dashboard.onBreak', 'On Break') : t('dashboard.onShift', 'On Shift')
            : t('dashboard.offShift', 'Off Shift')
        }`}
        accessibilityRole="summary"
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-muted-foreground">
              {t('dashboard.shiftStatus', 'Shift Status')}
            </Text>
            <Text className="text-lg font-semibold text-foreground">
              {onShift
                ? onBreak
                  ? t('dashboard.onBreak', 'On Break')
                  : t('dashboard.onShift', 'On Shift')
                : t('dashboard.offShift', 'Off Shift')}
            </Text>
          </View>
          {onShift && (
            <Pressable
              className={`rounded-lg px-4 py-2 ${onBreak ? 'bg-primary' : 'border border-border'}`}
              onPress={toggleBreak}
              accessibilityLabel={onBreak ? t('dashboard.endBreak', 'End Break') : t('dashboard.takeBreak', 'Break')}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className={`text-sm font-medium ${onBreak ? 'text-primary-foreground' : 'text-foreground'}`}>
                {onBreak ? t('dashboard.endBreak', 'End Break') : t('dashboard.takeBreak', 'Break')}
              </Text>
            </Pressable>
          )}
        </View>
        {currentShift && (
          <Text className="mt-1 text-xs text-muted-foreground">
            {currentShift.name} ({currentShift.startTime} – {currentShift.endTime})
          </Text>
        )}
        {!onShift && nextShift && (
          <Text className="mt-1 text-xs text-muted-foreground">
            {t('dashboard.nextShift', 'Next: {{name}} at {{time}}', {
              name: nextShift.name,
              time: nextShift.startTime,
            })}
          </Text>
        )}
      </View>

      {/* Stats row */}
      <View className="flex-row gap-3">
        <View
          className="flex-1 rounded-xl border border-border bg-card p-4"
          accessibilityLabel={`${t('dashboard.callsToday', 'Calls Today')}: ${todayCount}`}
          accessibilityRole="text"
        >
          <Text className="text-sm text-muted-foreground">
            {t('dashboard.callsToday', 'Calls Today')}
          </Text>
          <Text className="text-2xl font-bold text-foreground">{todayCount}</Text>
        </View>
        <View
          className="flex-1 rounded-xl border border-border bg-card p-4"
          accessibilityLabel={`${t('dashboard.volunteers', 'Volunteers')}: ${hasAvailable ? t('dashboard.available', 'Available') : t('dashboard.none', 'None')}`}
          accessibilityRole="text"
        >
          <Text className="text-sm text-muted-foreground">
            {t('dashboard.volunteers', 'Volunteers')}
          </Text>
          <Text className="text-2xl font-bold text-foreground">
            {hasAvailable
              ? t('dashboard.available', 'Available')
              : t('dashboard.none', 'None')}
          </Text>
        </View>
      </View>

      {/* Current call */}
      {currentCall && (
        <View>
          <Text className="mb-2 text-sm font-medium text-foreground">
            {t('dashboard.yourCall', 'Your Active Call')}
          </Text>
          <CallCard
            call={currentCall}
            isCurrent
            onHangup={() => hangupCall(currentCall.id)}
          />
        </View>
      )}

      {/* Ringing calls */}
      {ringingCalls.length > 0 && !onBreak && (
        <View>
          <Text className="mb-2 text-sm font-medium text-foreground">
            {t('dashboard.incomingCalls', 'Incoming Calls')}
          </Text>
          <View className="gap-2">
            {ringingCalls.map(call => (
              <CallCard
                key={call.id}
                call={call}
                onAnswer={() => answerCall(call.id)}
                onSpam={() => reportSpam(call.id)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty state */}
      {!currentCall && ringingCalls.length === 0 && !shiftLoading && (
        <View className="items-center py-8" accessibilityRole="text">
          <Text className="text-base text-muted-foreground">
            {onShift
              ? t('dashboard.waiting', 'Waiting for calls...')
              : t('dashboard.noActivity', 'No active calls')}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
