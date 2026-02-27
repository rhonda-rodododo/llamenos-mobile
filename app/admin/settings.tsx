/**
 * Admin settings screen — collapsible sections for hub configuration.
 * Full implementation with forms for telephony, spam, calls, custom fields, and roles.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePermission } from '@/hooks/usePermission'
import { toast } from '@/lib/toast'
import * as apiClient from '@/lib/api-client'
import type {
  TelephonySettings,
  SpamSettings,
  CallSettings,
  CustomFieldDefinition,
  Role,
} from '@/lib/types'
import { PERMISSION_CATALOG } from '@/lib/permissions'

// --- Shared Components ---

interface SettingSectionProps {
  title: string
  description: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function SettingSection({ title, description, expanded, onToggle, children, testID }: SettingSectionProps & { testID?: string }) {
  return (
    <View className="rounded-xl border border-border bg-card" testID={testID}>
      <Pressable className="p-4" onPress={onToggle} testID={testID ? `${testID}-toggle` : undefined}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground">{title}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">{description}</Text>
          </View>
          <Text className="text-lg text-muted-foreground">{expanded ? '\u2212' : '+'}</Text>
        </View>
      </Pressable>
      {expanded && (
        <View className="border-t border-border p-4" testID={testID ? `${testID}-content` : undefined}>
          {children}
        </View>
      )}
    </View>
  )
}

function LoadingState() {
  return (
    <View className="items-center py-6">
      <ActivityIndicator size="small" />
    </View>
  )
}

function FormLabel({ text }: { text: string }) {
  return <Text className="mb-1 text-sm font-medium text-foreground">{text}</Text>
}

function FormField({ children, className }: { children: React.ReactNode; className?: string }) {
  return <View className={`mb-3 ${className ?? ''}`}>{children}</View>
}

function SaveButton({
  onPress,
  isPending,
  label,
}: {
  onPress: () => void
  isPending: boolean
  label: string
}) {
  return (
    <Pressable
      className="mt-2 rounded-lg bg-primary px-4 py-2.5"
      onPress={onPress}
      disabled={isPending}
    >
      {isPending ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Text className="text-center text-sm font-semibold text-primary-foreground">{label}</Text>
      )}
    </Pressable>
  )
}

// --- Telephony Section ---

const PROVIDERS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'signalwire', label: 'SignalWire' },
  { value: 'vonage', label: 'Vonage' },
  { value: 'plivo', label: 'Plivo' },
  { value: 'asterisk', label: 'Asterisk' },
]

function TelephonySection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'telephony'],
    queryFn: () => apiClient.getTelephonySettings(),
  })

  const [form, setForm] = useState<Partial<TelephonySettings>>({})
  const [showProviderPicker, setShowProviderPicker] = useState(false)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (values: Partial<TelephonySettings>) => apiClient.updateTelephonySettings(values),
    onSuccess: () => {
      toast.success(t('telephonyProvider.saved', 'Telephony provider saved'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'telephony'] })
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  const testMutation = useMutation({
    mutationFn: (values: Partial<TelephonySettings>) => apiClient.testTelephonyConnection(values),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(t('telephonyProvider.testSuccess', 'Connection successful'))
      } else {
        toast.error(result.error ?? t('telephonyProvider.testFailed', 'Connection failed'))
      }
    },
    onError: () => toast.error(t('telephonyProvider.testFailed', 'Connection failed')),
  })

  const updateField = useCallback(<K extends keyof TelephonySettings>(key: K, value: TelephonySettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  if (isLoading) return <LoadingState />

  const providerType = form.type ?? 'twilio'

  return (
    <View>
      {/* Provider picker */}
      <FormField>
        <FormLabel text={t('telephonyProvider.provider', 'Provider')} />
        <Pressable
          className="rounded-lg border border-border px-3 py-2.5"
          onPress={() => setShowProviderPicker(!showProviderPicker)}
        >
          <Text className="text-sm text-foreground">
            {PROVIDERS.find(p => p.value === providerType)?.label ?? t('telephonyProvider.selectProvider', 'Select a provider')}
          </Text>
        </Pressable>
        {showProviderPicker && (
          <View className="mt-1 rounded-lg border border-border bg-card">
            {PROVIDERS.map(p => (
              <Pressable
                key={p.value}
                className={`border-b border-border px-3 py-2.5 ${providerType === p.value ? 'bg-primary/10' : ''}`}
                onPress={() => {
                  updateField('type', p.value)
                  setShowProviderPicker(false)
                }}
              >
                <Text className={`text-sm ${providerType === p.value ? 'font-semibold text-primary' : 'text-foreground'}`}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </FormField>

      {/* Common: Phone Number */}
      <FormField>
        <FormLabel text={t('telephonyProvider.phoneNumber', 'Hotline Phone Number')} />
        <TextInput
          className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          value={form.phoneNumber ?? ''}
          onChangeText={v => updateField('phoneNumber', v)}
          placeholder="+15551234567"
          keyboardType="phone-pad"
        />
      </FormField>

      {/* Twilio / SignalWire fields */}
      {(providerType === 'twilio' || providerType === 'signalwire') && (
        <>
          {providerType === 'signalwire' && (
            <FormField>
              <FormLabel text={t('telephonyProvider.signalwireSpace', 'SignalWire Space')} />
              <TextInput
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                value={form.signalwireSpace ?? ''}
                onChangeText={v => updateField('signalwireSpace', v)}
                placeholder="example.signalwire.com"
                autoCapitalize="none"
              />
            </FormField>
          )}
          <FormField>
            <FormLabel text={t('telephonyProvider.accountSid', 'Account SID')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.accountSid ?? ''}
              onChangeText={v => updateField('accountSid', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.authToken', 'Auth Token')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.authToken ?? ''}
              onChangeText={v => updateField('authToken', v)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.apiKeySid', 'API Key SID')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.apiKeySid ?? ''}
              onChangeText={v => updateField('apiKeySid', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.apiKeySecret', 'API Key Secret')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.apiKeySecret ?? ''}
              onChangeText={v => updateField('apiKeySecret', v)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.twimlAppSid', 'TwiML App SID')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.twimlAppSid ?? ''}
              onChangeText={v => updateField('twimlAppSid', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
        </>
      )}

      {/* Vonage fields */}
      {providerType === 'vonage' && (
        <>
          <FormField>
            <FormLabel text={t('telephonyProvider.apiKey', 'API Key')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.apiKey ?? ''}
              onChangeText={v => updateField('apiKey', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.apiSecret', 'API Secret')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.apiSecret ?? ''}
              onChangeText={v => updateField('apiSecret', v)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.applicationId', 'Application ID')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.applicationId ?? ''}
              onChangeText={v => updateField('applicationId', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
        </>
      )}

      {/* Plivo fields */}
      {providerType === 'plivo' && (
        <>
          <FormField>
            <FormLabel text={t('telephonyProvider.authId', 'Auth ID')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.authId ?? ''}
              onChangeText={v => updateField('authId', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.authToken', 'Auth Token')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.authToken ?? ''}
              onChangeText={v => updateField('authToken', v)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
        </>
      )}

      {/* Asterisk fields */}
      {providerType === 'asterisk' && (
        <>
          <FormField>
            <FormLabel text={t('telephonyProvider.ariUrl', 'ARI URL')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.ariUrl ?? ''}
              onChangeText={v => updateField('ariUrl', v)}
              placeholder="https://asterisk.example.com:8089/ari"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.ariUsername', 'ARI Username')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.ariUsername ?? ''}
              onChangeText={v => updateField('ariUsername', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.ariPassword', 'ARI Password')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.ariPassword ?? ''}
              onChangeText={v => updateField('ariPassword', v)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
          <FormField>
            <FormLabel text={t('telephonyProvider.bridgeCallbackUrl', 'Bridge Callback URL')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={form.bridgeCallbackUrl ?? ''}
              onChangeText={v => updateField('bridgeCallbackUrl', v)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormField>
        </>
      )}

      {/* Actions */}
      <View className="mt-2 flex-row gap-2">
        <Pressable
          className="flex-1 rounded-lg border border-border px-3 py-2.5"
          onPress={() => testMutation.mutate(form)}
          disabled={testMutation.isPending}
        >
          <Text className="text-center text-sm font-medium text-foreground">
            {testMutation.isPending
              ? t('telephonyProvider.testing', 'Testing...')
              : t('telephonyProvider.testConnection', 'Test Connection')}
          </Text>
        </Pressable>
        <SaveButton
          onPress={() => saveMutation.mutate(form)}
          isPending={saveMutation.isPending}
          label={t('telephonyProvider.saveProvider', 'Save Provider')}
        />
      </View>
    </View>
  )
}

// --- Spam Settings Section ---

function SpamSettingsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'spam'],
    queryFn: () => apiClient.getSpamSettings(),
  })

  const [form, setForm] = useState<Partial<SpamSettings>>({})

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (values: Partial<SpamSettings>) => apiClient.updateSpamSettings(values),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'spam'] })
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  if (isLoading) return <LoadingState />

  return (
    <View>
      {/* CAPTCHA toggle */}
      <FormField>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {t('spam.voiceCaptcha', 'Voice CAPTCHA')}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {t('spam.voiceCaptchaDescription', 'Require callers to enter a random number before connecting')}
            </Text>
          </View>
          <Switch
            value={form.captchaEnabled ?? false}
            onValueChange={v => setForm(prev => ({ ...prev, captchaEnabled: v }))}
          />
        </View>
      </FormField>

      {/* Rate limit toggle */}
      <FormField>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {t('spam.rateLimiting', 'Rate Limiting')}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {t('spam.rateLimitingDescription', 'Limit repeated calls from the same number')}
            </Text>
          </View>
          <Switch
            value={form.rateLimitEnabled ?? false}
            onValueChange={v => setForm(prev => ({ ...prev, rateLimitEnabled: v }))}
          />
        </View>
      </FormField>

      {/* Rate limit value */}
      <FormField>
        <FormLabel text={t('spam.maxCallsPerMinute', 'Max calls per minute per number')} />
        <TextInput
          className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          value={String(form.rateLimit ?? 5)}
          onChangeText={v => {
            const n = parseInt(v, 10)
            if (!isNaN(n) && n >= 1 && n <= 60) setForm(prev => ({ ...prev, rateLimit: n }))
          }}
          keyboardType="number-pad"
        />
      </FormField>

      {/* Ban duration */}
      <FormField>
        <FormLabel text={t('spam.blockDuration', 'Block duration (minutes)')} />
        <TextInput
          className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          value={String(form.banDurationMinutes ?? 30)}
          onChangeText={v => {
            const n = parseInt(v, 10)
            if (!isNaN(n) && n >= 1) setForm(prev => ({ ...prev, banDurationMinutes: n }))
          }}
          keyboardType="number-pad"
        />
      </FormField>

      {/* Auto-block threshold */}
      <FormField>
        <FormLabel text={t('settings.autoBlockThreshold', 'Auto-block threshold (violations)')} />
        <TextInput
          className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
          value={String(form.autoBlockThreshold ?? 10)}
          onChangeText={v => {
            const n = parseInt(v, 10)
            if (!isNaN(n) && n >= 1) setForm(prev => ({ ...prev, autoBlockThreshold: n }))
          }}
          keyboardType="number-pad"
        />
      </FormField>

      <SaveButton
        onPress={() => saveMutation.mutate(form)}
        isPending={saveMutation.isPending}
        label={t('common.save', 'Save')}
      />
    </View>
  )
}

// --- Call Settings Section ---

function CallSettingsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'call'],
    queryFn: () => apiClient.getCallSettings(),
  })

  const [form, setForm] = useState<Partial<CallSettings>>({})

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (values: Partial<CallSettings>) => apiClient.updateCallSettings(values),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'call'] })
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  if (isLoading) return <LoadingState />

  return (
    <View>
      {/* Queue timeout */}
      <FormField>
        <FormLabel text={t('callSettings.queueTimeout', 'Queue Timeout')} />
        <Text className="mb-1 text-xs text-muted-foreground">
          {t('callSettings.queueTimeoutDescription', 'How long callers wait before being sent to voicemail (seconds).')}
        </Text>
        <View className="flex-row items-center gap-3">
          <TextInput
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
            value={String(form.queueTimeoutSeconds ?? 60)}
            onChangeText={v => {
              const n = parseInt(v, 10)
              if (!isNaN(n) && n >= 10 && n <= 300) setForm(prev => ({ ...prev, queueTimeoutSeconds: n }))
            }}
            keyboardType="number-pad"
          />
          <Text className="text-xs text-muted-foreground">10-300s</Text>
        </View>
      </FormField>

      {/* Voicemail toggle */}
      <FormField>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {t('setup.voicemailEnabled', 'Voicemail')}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {t('setup.voicemailEnabledHelp', 'Allow callers to leave a voicemail if no one answers.')}
            </Text>
          </View>
          <Switch
            value={form.voicemailEnabled ?? true}
            onValueChange={v => setForm(prev => ({ ...prev, voicemailEnabled: v }))}
          />
        </View>
      </FormField>

      {/* Max voicemail duration */}
      {form.voicemailEnabled && (
        <FormField>
          <FormLabel text={t('callSettings.voicemailMax', 'Max Voicemail Length')} />
          <Text className="mb-1 text-xs text-muted-foreground">
            {t('callSettings.voicemailMaxDescription', 'Maximum recording length for voicemail messages (seconds).')}
          </Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={String(form.maxVoicemailSeconds ?? 120)}
              onChangeText={v => {
                const n = parseInt(v, 10)
                if (!isNaN(n) && n >= 30 && n <= 300) setForm(prev => ({ ...prev, maxVoicemailSeconds: n }))
              }}
              keyboardType="number-pad"
            />
            <Text className="text-xs text-muted-foreground">30-300s</Text>
          </View>
        </FormField>
      )}

      {/* Recording toggle */}
      <FormField>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-medium text-foreground">
              {t('recording.title', 'Call Recording')}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {t('settings.recordingDescription', 'Record calls for review by admins.')}
            </Text>
          </View>
          <Switch
            value={form.recordingEnabled ?? false}
            onValueChange={v => setForm(prev => ({ ...prev, recordingEnabled: v }))}
          />
        </View>
      </FormField>

      <SaveButton
        onPress={() => saveMutation.mutate(form)}
        isPending={saveMutation.isPending}
        label={t('common.save', 'Save')}
      />
    </View>
  )
}

// --- Custom Fields Section ---

const FIELD_TYPES: Array<{ value: CustomFieldDefinition['type']; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
]

const FIELD_CONTEXTS: Array<{ value: NonNullable<CustomFieldDefinition['context']>; label: string }> = [
  { value: 'note', label: 'Note' },
  { value: 'report', label: 'Report' },
  { value: 'both', label: 'Both' },
]

function CustomFieldsSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'custom-fields'],
    queryFn: () => apiClient.listCustomFields(),
  })

  const fields = data?.fields ?? []

  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<CustomFieldDefinition['type']>('text')
  const [newRequired, setNewRequired] = useState(false)
  const [newContext, setNewContext] = useState<NonNullable<CustomFieldDefinition['context']>>('note')
  const [newOptions, setNewOptions] = useState('')
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [showContextPicker, setShowContextPicker] = useState(false)

  const saveMutation = useMutation({
    mutationFn: (updatedFields: CustomFieldDefinition[]) => apiClient.updateCustomFields(updatedFields),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'custom-fields'] })
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  const handleAdd = useCallback(() => {
    if (!newLabel.trim()) return

    const newField: CustomFieldDefinition = {
      id: `field-${Date.now()}`,
      label: newLabel.trim(),
      type: newType,
      required: newRequired,
      context: newContext,
      visibleToVolunteers: true,
    }

    if ((newType === 'select' || newType === 'multiselect') && newOptions.trim()) {
      newField.options = newOptions.split(',').map(o => o.trim()).filter(Boolean)
    }

    saveMutation.mutate([...fields, newField])
    setNewLabel('')
    setNewType('text')
    setNewRequired(false)
    setNewContext('note')
    setNewOptions('')
    setShowAddForm(false)
  }, [newLabel, newType, newRequired, newContext, newOptions, fields, saveMutation])

  const handleDelete = useCallback((fieldId: string) => {
    Alert.alert(
      t('common.confirm', 'Confirm'),
      t('customFields.deleteConfirm', 'Delete this field? Existing notes with this field will keep their data.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: () => saveMutation.mutate(fields.filter(f => f.id !== fieldId)),
        },
      ],
    )
  }, [fields, saveMutation, t])

  if (isLoading) return <LoadingState />

  return (
    <View>
      {/* Existing fields list */}
      {fields.length === 0 ? (
        <Text className="mb-3 text-sm text-muted-foreground">
          {t('customFields.noFields', 'No custom fields defined')}
        </Text>
      ) : (
        <View className="mb-3 gap-2">
          {fields.map(field => (
            <View key={field.id} className="flex-row items-center justify-between rounded-lg border border-border bg-background p-3">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-foreground">{field.label}</Text>
                  <View className="rounded-full bg-primary/10 px-2 py-0.5">
                    <Text className="text-xs text-primary">{field.type}</Text>
                  </View>
                  {field.context && field.context !== 'both' && (
                    <View className="rounded-full bg-muted px-2 py-0.5">
                      <Text className="text-xs text-muted-foreground">{field.context}</Text>
                    </View>
                  )}
                  {field.required && (
                    <Text className="text-xs text-destructive">*</Text>
                  )}
                </View>
                {field.options && field.options.length > 0 && (
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {field.options.join(', ')}
                  </Text>
                )}
              </View>
              <Pressable
                className="rounded-lg border border-destructive/30 px-2.5 py-1"
                onPress={() => handleDelete(field.id)}
              >
                <Text className="text-xs text-destructive">{t('common.delete', 'Delete')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Add field form */}
      {showAddForm ? (
        <View className="gap-3 rounded-lg border border-border bg-background p-3">
          <FormField>
            <FormLabel text={t('customFields.fieldLabel', 'Field Label')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder={t('customFields.fieldLabel', 'Field Label')}
            />
          </FormField>

          {/* Type picker */}
          <FormField>
            <FormLabel text={t('customFields.fieldType', 'Type')} />
            <Pressable
              className="rounded-lg border border-border px-3 py-2.5"
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text className="text-sm text-foreground">
                {FIELD_TYPES.find(ft => ft.value === newType)?.label ?? 'Text'}
              </Text>
            </Pressable>
            {showTypePicker && (
              <View className="mt-1 rounded-lg border border-border bg-card">
                {FIELD_TYPES.map(ft => (
                  <Pressable
                    key={ft.value}
                    className={`border-b border-border px-3 py-2 ${newType === ft.value ? 'bg-primary/10' : ''}`}
                    onPress={() => { setNewType(ft.value); setShowTypePicker(false) }}
                  >
                    <Text className={`text-sm ${newType === ft.value ? 'font-semibold text-primary' : 'text-foreground'}`}>
                      {ft.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </FormField>

          {/* Options input for select types */}
          {(newType === 'select' || newType === 'multiselect') && (
            <FormField>
              <FormLabel text={t('customFields.options', 'Options')} />
              <TextInput
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                value={newOptions}
                onChangeText={setNewOptions}
                placeholder="Option 1, Option 2, Option 3"
              />
            </FormField>
          )}

          {/* Context picker */}
          <FormField>
            <FormLabel text={t('settings.context', 'Context')} />
            <Pressable
              className="rounded-lg border border-border px-3 py-2.5"
              onPress={() => setShowContextPicker(!showContextPicker)}
            >
              <Text className="text-sm text-foreground">
                {FIELD_CONTEXTS.find(fc => fc.value === newContext)?.label ?? 'Note'}
              </Text>
            </Pressable>
            {showContextPicker && (
              <View className="mt-1 rounded-lg border border-border bg-card">
                {FIELD_CONTEXTS.map(fc => (
                  <Pressable
                    key={fc.value}
                    className={`border-b border-border px-3 py-2 ${newContext === fc.value ? 'bg-primary/10' : ''}`}
                    onPress={() => { setNewContext(fc.value); setShowContextPicker(false) }}
                  >
                    <Text className={`text-sm ${newContext === fc.value ? 'font-semibold text-primary' : 'text-foreground'}`}>
                      {fc.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </FormField>

          {/* Required toggle */}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-foreground">
              {t('customFields.required', 'Required')}
            </Text>
            <Switch value={newRequired} onValueChange={setNewRequired} />
          </View>

          {/* Form actions */}
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 rounded-lg border border-border px-3 py-2.5"
              onPress={() => setShowAddForm(false)}
            >
              <Text className="text-center text-sm text-foreground">{t('common.cancel', 'Cancel')}</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-lg bg-primary px-3 py-2.5"
              onPress={handleAdd}
              disabled={!newLabel.trim() || saveMutation.isPending}
            >
              <Text className="text-center text-sm font-semibold text-primary-foreground">
                {t('common.add', 'Add')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          className="rounded-lg border border-dashed border-border px-3 py-2.5"
          onPress={() => setShowAddForm(true)}
          disabled={fields.length >= 20}
        >
          <Text className="text-center text-sm font-medium text-primary">
            {fields.length >= 20
              ? t('customFields.maxFields', 'Maximum 20 fields reached')
              : t('customFields.addField', 'Add Field')}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

// --- Roles & Permissions Section ---

/** Group permission keys by their domain prefix (calls, notes, etc.) */
function getPermissionsByDomain(): Record<string, Array<{ key: string; label: string }>> {
  const domains: Record<string, Array<{ key: string; label: string }>> = {}
  for (const [key, label] of Object.entries(PERMISSION_CATALOG)) {
    const domain = key.split(':')[0]
    if (!domains[domain]) domains[domain] = []
    domains[domain].push({ key, label })
  }
  return domains
}

function RolesSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: () => apiClient.listRoles(),
  })

  const roles = data?.roles ?? []
  const permissionsByDomain = getPermissionsByDomain()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())

  const createMutation = useMutation({
    mutationFn: (role: { name: string; description?: string; permissions: string[] }) =>
      apiClient.createRole(role),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] })
      resetForm()
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Partial<Role> }) =>
      apiClient.updateRole(id, role),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] })
      resetForm()
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteRole(id),
    onSuccess: () => {
      toast.success(t('common.success', 'Success'))
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] })
    },
    onError: () => toast.error(t('common.error', 'Error')),
  })

  const resetForm = useCallback(() => {
    setShowAddForm(false)
    setEditingRoleId(null)
    setRoleName('')
    setRoleDescription('')
    setSelectedPermissions(new Set())
  }, [])

  const startEdit = useCallback((role: Role) => {
    setEditingRoleId(role.id)
    setRoleName(role.name)
    setRoleDescription(role.description)
    setSelectedPermissions(new Set(role.permissions))
    setShowAddForm(true)
  }, [])

  const togglePermission = useCallback((perm: string) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }, [])

  const handleSave = useCallback(() => {
    if (!roleName.trim()) return

    const permissions = Array.from(selectedPermissions)
    if (editingRoleId) {
      updateMutation.mutate({
        id: editingRoleId,
        role: { name: roleName.trim(), description: roleDescription.trim(), permissions },
      })
    } else {
      createMutation.mutate({
        name: roleName.trim(),
        description: roleDescription.trim() || undefined,
        permissions,
      })
    }
  }, [roleName, roleDescription, selectedPermissions, editingRoleId, createMutation, updateMutation])

  const handleDelete = useCallback((role: Role) => {
    Alert.alert(
      t('common.confirm', 'Confirm'),
      t('settings.deleteRoleConfirm', 'Delete the "{{name}}" role?', { name: role.name }),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.delete', 'Delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(role.id),
        },
      ],
    )
  }, [t, deleteMutation])

  if (isLoading) return <LoadingState />

  return (
    <View>
      {/* Existing roles */}
      {roles.length === 0 ? (
        <Text className="mb-3 text-sm text-muted-foreground">
          {t('settings.noRoles', 'No roles defined')}
        </Text>
      ) : (
        <View className="mb-3 gap-2">
          {roles.map(role => (
            <View key={role.id} className="rounded-lg border border-border bg-background p-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-medium text-foreground">{role.name}</Text>
                    {role.isSystem && (
                      <View className="rounded-full bg-muted px-2 py-0.5">
                        <Text className="text-xs text-muted-foreground">
                          {t('settings.builtin', 'Built-in')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {role.description ? (
                    <Text className="mt-0.5 text-xs text-muted-foreground">{role.description}</Text>
                  ) : null}
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {role.permissions.length} {t('settings.permissionsCount', 'permissions')}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  {!role.isSystem && (
                    <>
                      <Pressable
                        className="rounded-lg border border-border px-2.5 py-1"
                        onPress={() => startEdit(role)}
                      >
                        <Text className="text-xs text-foreground">{t('common.edit', 'Edit')}</Text>
                      </Pressable>
                      <Pressable
                        className="rounded-lg border border-destructive/30 px-2.5 py-1"
                        onPress={() => handleDelete(role)}
                      >
                        <Text className="text-xs text-destructive">{t('common.delete', 'Delete')}</Text>
                      </Pressable>
                    </>
                  )}
                  {role.isSystem && (
                    <Pressable
                      className="rounded-lg border border-border px-2.5 py-1"
                      onPress={() => startEdit(role)}
                    >
                      <Text className="text-xs text-foreground">{t('common.edit', 'Edit')}</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add/edit role form */}
      {showAddForm ? (
        <View className="gap-3 rounded-lg border border-border bg-background p-3">
          <FormField>
            <FormLabel text={t('settings.roleName', 'Role Name')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={roleName}
              onChangeText={setRoleName}
              placeholder={t('settings.roleName', 'Role Name')}
              editable={editingRoleId ? !roles.find(r => r.id === editingRoleId)?.isSystem : true}
            />
          </FormField>

          <FormField>
            <FormLabel text={t('settings.roleDescription', 'Description')} />
            <TextInput
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
              value={roleDescription}
              onChangeText={setRoleDescription}
              placeholder={t('settings.roleDescriptionPlaceholder', 'Optional description')}
            />
          </FormField>

          {/* Permissions grouped by domain */}
          <View>
            <FormLabel text={t('settings.permissions', 'Permissions')} />
            {Object.entries(permissionsByDomain).map(([domain, perms]) => (
              <View key={domain} className="mb-3">
                <Text className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  {domain}
                </Text>
                {perms.map(perm => (
                  <Pressable
                    key={perm.key}
                    className="flex-row items-center gap-2 py-1"
                    onPress={() => togglePermission(perm.key)}
                  >
                    <View className={`h-4 w-4 items-center justify-center rounded border ${
                      selectedPermissions.has(perm.key)
                        ? 'border-primary bg-primary'
                        : 'border-border'
                    }`}>
                      {selectedPermissions.has(perm.key) && (
                        <Text className="text-[10px] text-primary-foreground">{'✓'}</Text>
                      )}
                    </View>
                    <Text className="flex-1 text-xs text-foreground">{perm.label}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          {/* Form actions */}
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 rounded-lg border border-border px-3 py-2.5"
              onPress={resetForm}
            >
              <Text className="text-center text-sm text-foreground">{t('common.cancel', 'Cancel')}</Text>
            </Pressable>
            <Pressable
              className="flex-1 rounded-lg bg-primary px-3 py-2.5"
              onPress={handleSave}
              disabled={!roleName.trim() || createMutation.isPending || updateMutation.isPending}
            >
              <Text className="text-center text-sm font-semibold text-primary-foreground">
                {editingRoleId ? t('common.save', 'Save') : t('common.add', 'Add')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          className="rounded-lg border border-dashed border-border px-3 py-2.5"
          onPress={() => { resetForm(); setShowAddForm(true) }}
        >
          <Text className="text-center text-sm font-medium text-primary">
            {t('settings.addRole', 'Add Role')}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

// --- Main Screen ---

export default function AdminSettingsScreen() {
  const { t } = useTranslation()
  const canManage = usePermission('settings:manage')
  const canManageTelephony = usePermission('settings:manage-telephony')
  const canManageSpam = usePermission('settings:manage-spam')
  const canManageFields = usePermission('settings:manage-fields')
  const canManageRoles = usePermission('system:manage-roles')

  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (key: string) => {
    setExpandedSection(prev => prev === key ? null : key)
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-3"
      testID="admin-settings-screen"
    >
      {(canManage || canManageTelephony) && (
        <SettingSection
          title={t('telephonyProvider.title', 'Telephony Provider')}
          description={t('telephonyProvider.description', 'Configure the telephony provider used for handling calls')}
          expanded={expandedSection === 'telephony'}
          onToggle={() => toggleSection('telephony')}
          testID="admin-section-telephony"
        >
          <TelephonySection />
        </SettingSection>
      )}

      {(canManage || canManageSpam) && (
        <SettingSection
          title={t('spam.title', 'Spam Mitigation')}
          description={t('settings.spamDesc', 'Voice CAPTCHA and rate limiting')}
          expanded={expandedSection === 'spam'}
          onToggle={() => toggleSection('spam')}
          testID="admin-section-spam"
        >
          <SpamSettingsSection />
        </SettingSection>
      )}

      {canManage && (
        <SettingSection
          title={t('callSettings.title', 'Call Settings')}
          description={t('callSettings.description', 'Configure call queue behavior and voicemail settings.')}
          expanded={expandedSection === 'calls'}
          onToggle={() => toggleSection('calls')}
          testID="admin-section-calls"
        >
          <CallSettingsSection />
        </SettingSection>
      )}

      {(canManage || canManageFields) && (
        <SettingSection
          title={t('customFields.title', 'Custom Note Fields')}
          description={t('customFields.description', 'Define additional fields that appear on the note form')}
          expanded={expandedSection === 'fields'}
          onToggle={() => toggleSection('fields')}
          testID="admin-section-fields"
        >
          <CustomFieldsSection />
        </SettingSection>
      )}

      {(canManage || canManageRoles) && (
        <SettingSection
          title={t('settings.roles', 'Roles & Permissions')}
          description={t('settings.rolesDesc', 'Custom role management')}
          expanded={expandedSection === 'roles'}
          onToggle={() => toggleSection('roles')}
          testID="admin-section-roles"
        >
          <RolesSection />
        </SettingSection>
      )}
    </ScrollView>
  )
}
