/**
 * Tab navigator layout for authenticated screens.
 * Bottom tabs: Dashboard, Notes, Conversations, Shifts, Settings.
 */

import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { usePermission } from '@/hooks/usePermission'

export default function TabsLayout() {
  const { t } = useTranslation()
  const canViewConversations = usePermission('conversations:read-assigned')

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.dashboard', 'Dashboard'),
          tabBarLabel: t('nav.dashboard', 'Dashboard'),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: t('nav.notes', 'Notes'),
          tabBarLabel: t('nav.notes', 'Notes'),
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: t('nav.conversations', 'Messages'),
          tabBarLabel: t('nav.messages', 'Messages'),
          href: canViewConversations ? undefined : null, // Hide tab if no permission
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: t('nav.shifts', 'Shifts'),
          tabBarLabel: t('nav.shifts', 'Shifts'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('nav.settings', 'Settings'),
          tabBarLabel: t('nav.settings', 'Settings'),
        }}
      />
    </Tabs>
  )
}
