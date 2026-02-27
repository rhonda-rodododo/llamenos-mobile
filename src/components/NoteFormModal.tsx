/**
 * Note form modal — create or edit encrypted notes (Epic 127).
 * Used from conversation threads and can be opened from anywhere.
 */

import { useState, useCallback } from 'react'
import { View, Text, TextInput, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useColorScheme } from 'nativewind'
import { useQuery } from '@tanstack/react-query'
import { CustomFieldInputs } from './CustomFieldInputs'
import { useAuthStore } from '@/lib/store'
import { encryptNoteV2 } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import * as apiClient from '@/lib/api-client'
import { colors } from '@/lib/theme'
import { haptic } from '@/lib/haptics'
import { toast } from '@/lib/toast'
import { fieldMatchesContext, type CustomFieldContext, type NotePayload } from '@/lib/types'

interface NoteFormModalProps {
  visible: boolean
  onClose: () => void
  onSaved: () => void
  callId?: string
  conversationId?: string
  editNoteId?: string
  initialText?: string
  initialFields?: Record<string, string | number | boolean>
}

export function NoteFormModal({
  visible,
  onClose,
  onSaved,
  callId,
  conversationId,
  editNoteId,
  initialText = '',
  initialFields,
}: NoteFormModalProps) {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'
  const publicKey = useAuthStore(s => s.publicKey)
  const isAdmin = useAuthStore(s => s.isAdmin)

  const [noteText, setNoteText] = useState(initialText)
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean>>(initialFields ?? {})
  const [saving, setSaving] = useState(false)

  // Fetch custom fields
  const { data: fieldsData } = useQuery({
    queryKey: ['custom-fields'],
    queryFn: () => apiClient.getCustomFields(),
    enabled: visible,
  })

  // Context-dependent custom field filtering
  const fieldContext: CustomFieldContext = conversationId ? 'conversation-notes' : 'call-notes'
  const visibleFields = (fieldsData?.fields ?? [])
    .filter(f => fieldMatchesContext(f, fieldContext))
    .filter(f => isAdmin || f.visibleToVolunteers)
    .sort((a, b) => a.order - b.order)

  const handleFieldChange = useCallback((name: string, value: string | number | boolean) => {
    setFieldValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!noteText.trim() || !publicKey) return
    setSaving(true)

    try {
      const pk = keyManager.getPublicKeyHex()
      if (!pk) throw new Error('No public key')

      // Build payload
      const payload: NotePayload = { text: noteText.trim() }
      const filledFields = Object.entries(fieldValues).filter(([, v]) => v !== '' && v !== undefined)
      if (filledFields.length > 0) {
        payload.fields = Object.fromEntries(filledFields)
      }

      // Encrypt
      const encrypted = encryptNoteV2(payload, pk, []) // Admin envelopes added server-side for non-admin users

      if (editNoteId) {
        await apiClient.updateNote(editNoteId, {
          encryptedContent: encrypted.encryptedContent,
          authorEnvelope: encrypted.authorEnvelope,
          adminEnvelopes: encrypted.adminEnvelopes,
        })
      } else {
        await apiClient.createNote({
          callId: callId || undefined,
          conversationId: conversationId || undefined,
          encryptedContent: encrypted.encryptedContent,
          authorEnvelope: encrypted.authorEnvelope,
          adminEnvelopes: encrypted.adminEnvelopes,
        })
      }

      haptic.success()
      toast.success(t('notes.saved', 'Note saved'))
      setNoteText('')
      setFieldValues({})
      onSaved()
      onClose()
    } catch {
      haptic.error()
      toast.error(t('common.error', 'Something went wrong'))
    } finally {
      setSaving(false)
    }
  }, [noteText, fieldValues, publicKey, editNoteId, callId, conversationId, onSaved, onClose, t])

  const isConversationNote = !!conversationId
  const title = editNoteId
    ? t('notes.editNote', 'Edit Note')
    : isConversationNote
      ? t('notes.newConversationNote', 'New Conversation Note')
      : t('notes.addNote', 'Add Note')

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="note-form-modal"
    >
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Pressable onPress={onClose} hitSlop={12}>
            <Text className="text-base text-primary">{t('common.cancel', 'Cancel')}</Text>
          </Pressable>
          <Text className="text-base font-semibold text-foreground">{title}</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving || !noteText.trim()}
            hitSlop={12}
            testID="note-save-btn"
          >
            {saving ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className={`text-base font-semibold ${noteText.trim() ? 'text-primary' : 'text-muted-foreground'}`}>
                {t('common.save', 'Save')}
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-4 gap-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Context badge */}
          {isConversationNote && (
            <View className="flex-row items-center gap-2">
              <View className="rounded-full bg-primary/10 px-3 py-1">
                <Text className="text-xs font-medium text-primary">
                  {t('notes.conversationNote', 'Conversation note')}
                </Text>
              </View>
            </View>
          )}

          {/* Note text */}
          <View>
            <Text className="mb-1 text-sm font-medium text-muted-foreground">
              {t('notes.content', 'Note Content')}
            </Text>
            <TextInput
              className="min-h-[120px] rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
              value={noteText}
              onChangeText={setNoteText}
              placeholder={t('notes.placeholder', 'Write your note...')}
              placeholderTextColor={colors[scheme].mutedForeground}
              multiline
              textAlignVertical="top"
              autoFocus
              testID="note-text-input"
            />
          </View>

          {/* Custom fields */}
          <CustomFieldInputs
            fields={visibleFields}
            values={fieldValues}
            onChange={handleFieldChange}
            isAdmin={isAdmin}
          />

          {/* E2EE badge */}
          <View className="flex-row items-center justify-center gap-1 py-2">
            <Text className="text-xs text-muted-foreground">
              {t('conversations.encrypted', 'End-to-end encrypted')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
