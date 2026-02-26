/**
 * Active call screen — shows call status, timer, VoIP controls, and note-taking.
 *
 * Supports two modes:
 * - VoIP (native Linphone): full in-app audio with mute/speaker/hold controls
 * - Phone network (Twilio parallel ring): coordination only (call info, notes, hangup)
 */

import { useState, useCallback, useMemo } from 'react'
import { View, Text, TextInput, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useCallTimer } from '@/lib/hooks'
import { useAuthStore } from '@/lib/store'
import { cryptoProvider } from '@/lib/crypto-provider'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import { useVoip, isVoipAvailable } from '@/lib/voip'

export default function ActiveCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)

  const [startedAt] = useState(() => new Date().toISOString())
  const { formatted } = useCallTimer(startedAt)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [hangingUp, setHangingUp] = useState(false)

  // VoIP state — hooks are always called, but controls only shown when available
  const voip = useVoip()

  // Check if this call is a VoIP call (activeCall matches our call ID)
  const isVoipCall = useMemo(
    () => isVoipAvailable && voip.activeCall?.callId === id,
    [voip.activeCall, id],
  )

  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim() || !publicKey || !id) return
    setSaving(true)

    try {
      const pk = keyManager.getPublicKeyHex()
      if (!pk) throw new Error('No public key')

      const encrypted = cryptoProvider.encryptNote(
        { text: noteText.trim() },
        pk,
        [],
      )

      await apiClient.createNote({
        callId: id,
        encryptedContent: encrypted.encryptedContent,
        authorEnvelope: encrypted.authorEnvelope,
      })

      setNoteText('')
      Alert.alert(t('calls.noteSaved', 'Note saved'))
    } catch {
      Alert.alert(t('calls.noteError', 'Error'), t('calls.noteSaveError', 'Failed to save note'))
    } finally {
      setSaving(false)
    }
  }, [noteText, publicKey, id, t])

  const handleHangup = useCallback(async () => {
    if (!id) return
    setHangingUp(true)

    try {
      // Save any pending note before hanging up
      if (noteText.trim() && publicKey) {
        try {
          const pk = keyManager.getPublicKeyHex()
          if (pk) {
            const encrypted = cryptoProvider.encryptNote(
              { text: noteText.trim() },
              pk,
              [],
            )
            await apiClient.createNote({
              callId: id,
              encryptedContent: encrypted.encryptedContent,
              authorEnvelope: encrypted.authorEnvelope,
            })
          }
        } catch {
          // Continue with hangup even if note save fails
        }
      }

      // VoIP hangup (native SIP BYE) + server hangup
      if (isVoipCall) {
        await voip.hangup(id)
      }
      await apiClient.hangupCall(id)
      router.back()
    } catch {
      Alert.alert(t('calls.error', 'Error'), t('calls.hangupError', 'Failed to hang up'))
    } finally {
      setHangingUp(false)
    }
  }, [id, noteText, publicKey, t, isVoipCall, voip])

  const handleSpam = useCallback(async () => {
    if (!id) return
    Alert.alert(
      t('calls.spamTitle', 'Report Spam'),
      t('calls.spamMessage', 'Report this caller as spam and hang up?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('calls.spam', 'Report Spam'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (isVoipCall) {
                await voip.hangup(id)
              }
              await apiClient.reportCallSpam(id)
              router.back()
            } catch {
              Alert.alert(t('calls.error', 'Error'), t('calls.spamError', 'Failed to report spam'))
            }
          },
        },
      ],
    )
  }, [id, t, isVoipCall, voip])

  const callInfo = voip.activeCall
  const isMuted = callInfo?.isMuted ?? false
  const isSpeaker = callInfo?.isSpeaker ?? false
  const isPaused = callInfo?.state === 'paused'
  const encryptionLabel = callInfo?.mediaEncryption === 'zrtp'
    ? 'ZRTP'
    : callInfo?.mediaEncryption === 'srtp'
      ? 'SRTP'
      : callInfo?.mediaEncryption === 'dtls-srtp'
        ? 'DTLS'
        : null

  return (
    <>
      <Stack.Screen options={{ title: t('calls.activeCall', 'Active Call') }} />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 gap-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Call info */}
          <View className="items-center rounded-xl border border-green-500/30 bg-green-500/5 p-6">
            <View className="mb-2 h-4 w-4 rounded-full bg-green-500" />
            <Text className="text-sm text-muted-foreground">
              {isPaused
                ? t('calls.onHold', 'On Hold')
                : t('calls.inProgress', 'In Progress')}
            </Text>
            <Text className="font-mono text-3xl font-bold text-foreground">
              {formatted}
            </Text>
            {/* Encryption badge */}
            {isVoipCall && encryptionLabel && (
              <View className="mt-2 rounded-full bg-green-500/20 px-3 py-1">
                <Text className="text-xs font-medium text-green-700 dark:text-green-300">
                  {encryptionLabel} {t('calls.encrypted', 'Encrypted')}
                </Text>
              </View>
            )}
          </View>

          {/* VoIP call controls — only shown for native VoIP calls */}
          {isVoipCall && (
            <View className="flex-row justify-center gap-4">
              {/* Mute */}
              <Pressable
                className={`items-center rounded-full p-4 ${isMuted ? 'bg-destructive/20' : 'bg-muted'}`}
                onPress={() => voip.toggleMute(id!)}
                accessibilityLabel={isMuted ? t('calls.unmute', 'Unmute') : t('calls.mute', 'Mute')}
              >
                <Text className={`text-2xl ${isMuted ? 'text-destructive' : 'text-foreground'}`}>
                  {isMuted ? '🔇' : '🎤'}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {isMuted ? t('calls.unmute', 'Unmute') : t('calls.mute', 'Mute')}
                </Text>
              </Pressable>

              {/* Speaker */}
              <Pressable
                className={`items-center rounded-full p-4 ${isSpeaker ? 'bg-primary/20' : 'bg-muted'}`}
                onPress={() => voip.toggleSpeaker()}
                accessibilityLabel={isSpeaker ? t('calls.earpiece', 'Earpiece') : t('calls.speaker', 'Speaker')}
              >
                <Text className="text-2xl">
                  {isSpeaker ? '🔊' : '🔈'}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {isSpeaker ? t('calls.earpiece', 'Earpiece') : t('calls.speaker', 'Speaker')}
                </Text>
              </Pressable>

              {/* Hold */}
              <Pressable
                className={`items-center rounded-full p-4 ${isPaused ? 'bg-amber-500/20' : 'bg-muted'}`}
                onPress={() => isPaused ? voip.resumeCall(id!) : voip.holdCall(id!)}
                accessibilityLabel={isPaused ? t('calls.resume', 'Resume') : t('calls.hold', 'Hold')}
              >
                <Text className="text-2xl">
                  {isPaused ? '▶️' : '⏸️'}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  {isPaused ? t('calls.resume', 'Resume') : t('calls.hold', 'Hold')}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Note editor */}
          <View className="gap-2">
            <Text className="text-sm font-medium text-foreground">
              {t('calls.notes', 'Call Notes')}
            </Text>
            <TextInput
              className="min-h-[120px] rounded-xl border border-border bg-card p-4 text-base text-foreground"
              placeholder={t('calls.notePlaceholder', 'Type your notes here...')}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              className="rounded-lg bg-primary px-4 py-3"
              onPress={handleSaveNote}
              disabled={saving || !noteText.trim()}
            >
              <Text className="text-center font-semibold text-primary-foreground">
                {saving ? t('calls.saving', 'Saving...') : t('calls.saveNote', 'Save Note')}
              </Text>
            </Pressable>
          </View>

          {/* Actions */}
          <View className="gap-2 pt-4">
            <Pressable
              className="rounded-lg bg-destructive px-4 py-4"
              onPress={handleHangup}
              disabled={hangingUp}
            >
              <Text className="text-center text-lg font-bold text-white">
                {hangingUp ? t('calls.hangingUp', 'Hanging up...') : t('calls.hangup', 'Hang Up')}
              </Text>
            </Pressable>

            <Pressable
              className="rounded-lg border border-destructive/30 px-4 py-3"
              onPress={handleSpam}
            >
              <Text className="text-center text-sm text-destructive">
                {t('calls.reportSpam', 'Report Spam')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}
