/**
 * Admin section stack navigator.
 * Guarded by permission check — redirects non-admins.
 */

import { Stack, Redirect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useIsAdmin } from '@/hooks/usePermission'

export default function AdminLayout() {
  const { t } = useTranslation()
  const isAdmin = useIsAdmin()

  if (!isAdmin) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <Stack>
      <Stack.Screen
        name="volunteers"
        options={{ title: t('admin.volunteers', 'Volunteers') }}
      />
      <Stack.Screen
        name="bans"
        options={{ title: t('admin.bans', 'Ban List') }}
      />
      <Stack.Screen
        name="audit"
        options={{ title: t('admin.audit', 'Audit Log') }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: t('admin.settings', 'Settings') }}
      />
      <Stack.Screen
        name="contacts"
        options={{ title: t('contacts.title', 'Contacts') }}
      />
      <Stack.Screen
        name="contact/[hash]"
        options={{ title: t('contacts.contact', 'Contact') }}
      />
    </Stack>
  )
}
