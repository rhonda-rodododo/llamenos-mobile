/**
 * Admin settings screen — collapsible sections for hub configuration.
 * Priority sections for mobile: telephony, spam, calls, custom fields.
 */

import { useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { usePermission } from '@/hooks/usePermission'

interface SettingSectionProps {
  title: string
  description: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function SettingSection({ title, description, expanded, onToggle, children }: SettingSectionProps) {
  return (
    <View className="rounded-xl border border-border bg-card">
      <Pressable className="p-4" onPress={onToggle}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground">{title}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">{description}</Text>
          </View>
          <Text className="text-lg text-muted-foreground">{expanded ? '−' : '+'}</Text>
        </View>
      </Pressable>
      {expanded && (
        <View className="border-t border-border p-4">
          {children}
        </View>
      )}
    </View>
  )
}

export default function AdminSettingsScreen() {
  const { t } = useTranslation()
  const canManage = usePermission('settings:manage')
  const canManageTelephony = usePermission('settings:manage-telephony')
  const canManageSpam = usePermission('settings:manage-spam')
  const canManageFields = usePermission('settings:manage-fields')

  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const toggleSection = (key: string) => {
    setExpandedSection(prev => prev === key ? null : key)
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4 gap-3"
    >
      {(canManage || canManageTelephony) && (
        <SettingSection
          title={t('settings.telephony', 'Telephony Provider')}
          description={t('settings.telephonyDesc', 'Voice provider configuration')}
          expanded={expandedSection === 'telephony'}
          onToggle={() => toggleSection('telephony')}
        >
          <Text className="text-sm text-muted-foreground">
            {t('settings.telephonyPlaceholder', 'Telephony provider settings will be available here. Configure your Twilio, SignalWire, or other voice provider.')}
          </Text>
        </SettingSection>
      )}

      {(canManage || canManageSpam) && (
        <SettingSection
          title={t('settings.spam', 'Spam Settings')}
          description={t('settings.spamDesc', 'Voice CAPTCHA and rate limiting')}
          expanded={expandedSection === 'spam'}
          onToggle={() => toggleSection('spam')}
        >
          <Text className="text-sm text-muted-foreground">
            {t('settings.spamPlaceholder', 'Spam protection settings will be available here. Toggle voice CAPTCHA, adjust rate limits.')}
          </Text>
        </SettingSection>
      )}

      {canManage && (
        <SettingSection
          title={t('settings.callSettings', 'Call Settings')}
          description={t('settings.callSettingsDesc', 'Queue timeout, voicemail')}
          expanded={expandedSection === 'calls'}
          onToggle={() => toggleSection('calls')}
        >
          <Text className="text-sm text-muted-foreground">
            {t('settings.callSettingsPlaceholder', 'Call routing settings will be available here. Adjust queue timeout, voicemail duration.')}
          </Text>
        </SettingSection>
      )}

      {(canManage || canManageFields) && (
        <SettingSection
          title={t('settings.customFields', 'Custom Fields')}
          description={t('settings.customFieldsDesc', 'Note and report field definitions')}
          expanded={expandedSection === 'fields'}
          onToggle={() => toggleSection('fields')}
        >
          <Text className="text-sm text-muted-foreground">
            {t('settings.customFieldsPlaceholder', 'Custom field definitions will be available here. Add text, number, checkbox, or select fields to notes and reports.')}
          </Text>
        </SettingSection>
      )}

      {canManage && (
        <SettingSection
          title={t('settings.roles', 'Roles & Permissions')}
          description={t('settings.rolesDesc', 'Custom role management')}
          expanded={expandedSection === 'roles'}
          onToggle={() => toggleSection('roles')}
        >
          <Text className="text-sm text-muted-foreground">
            {t('settings.rolesPlaceholder', 'Role management will be available here. Create custom roles, assign permissions.')}
          </Text>
        </SettingSection>
      )}
    </ScrollView>
  )
}
