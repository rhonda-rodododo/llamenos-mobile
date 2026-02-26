/**
 * Active call screen — shows call status, timer, and note-taking.
 *
 * On mobile, the actual voice connection is via the phone network
 * (Twilio parallel ringing calls the volunteer's phone number).
 * This screen handles coordination: call info, notes, and hangup.
 */

import { useState, useCallback } from 'react'
import { View, Text, TextInput, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useCallTimer } from '@/lib/hooks'
import { useAuthStore } from '@/lib/store'
import { encryptNoteV2 } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'

export default function ActiveCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const publicKey = useAuthStore(s => s.publicKey)

  const [startedAt] = useState(() => new Date().toISOString())
  const { formatted } = useCallTimer(startedAt)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [hangingUp, setHangingUp] = useState(false)

  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim() || !publicKey || !id) return
    setSaving(true)

    try {
      const pk = keyManager.getPublicKeyHex()
      if (!pk) throw new Error('No public key')

      const encrypted = encryptNoteV2(
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
            const encrypted = encryptNoteV2(
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

      await apiClient.hangupCall(id)
      router.back()
    } catch {
      Alert.alert(t('calls.error', 'Error'), t('calls.hangupError', 'Failed to hang up'))
    } finally {
      setHangingUp(false)
    }
  }, [id, noteText, publicKey, t])

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
              await apiClient.reportCallSpam(id)
              router.back()
            } catch {
              Alert.alert(t('calls.error', 'Error'), t('calls.spamError', 'Failed to report spam'))
            }
          },
        },
      ],
    )
  }, [id, t])

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
              {t('calls.inProgress', 'In Progress')}
            </Text>
            <Text className="font-mono text-3xl font-bold text-foreground">
              {formatted}
            </Text>
          </View>

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
