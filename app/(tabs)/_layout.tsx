/**
 * Tab navigator layout for authenticated screens (Epic 89 polish).
 *
 * Bottom tabs: Dashboard, Notes, Conversations, Shifts, Settings.
 * Theme-aware tab bar colors.
 */

import { Tabs } from 'expo-router'
import { useColorScheme } from 'nativewind'
import { useTranslation } from 'react-i18next'
import { usePermission } from '@/hooks/usePermission'
import { colors } from '@/lib/theme'

// Expo Router's Tabs types don't include tabBarTestID, but the underlying
// React Navigation bottom tab navigator supports it. Extend with a helper.
function tabOptions(opts: Record<string, unknown>) {
  return opts
}

export default function TabsLayout() {
  const { t } = useTranslation()
  const { colorScheme } = useColorScheme()
  const canViewConversations = usePermission('conversations:read-assigned')
  const scheme = colorScheme === 'dark' ? 'dark' : 'light'
  const c = colors[scheme]

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.foreground,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={tabOptions({
          title: t('nav.dashboard', 'Dashboard'),
          tabBarLabel: t('nav.dashboard', 'Dashboard'),
          tabBarAccessibilityLabel: t('nav.dashboard', 'Dashboard'),
          tabBarTestID: 'tab-dashboard',
        })}
      />
      <Tabs.Screen
        name="notes"
        options={tabOptions({
          title: t('nav.notes', 'Notes'),
          tabBarLabel: t('nav.notes', 'Notes'),
          tabBarAccessibilityLabel: t('nav.notes', 'Notes'),
          tabBarTestID: 'tab-notes',
        })}
      />
      <Tabs.Screen
        name="conversations"
        options={tabOptions({
          title: t('nav.conversations', 'Messages'),
          tabBarLabel: t('nav.messages', 'Messages'),
          tabBarAccessibilityLabel: t('nav.conversations', 'Messages'),
          tabBarTestID: 'tab-conversations',
          href: canViewConversations ? undefined : null,
        })}
      />
      <Tabs.Screen
        name="shifts"
        options={tabOptions({
          title: t('nav.shifts', 'Shifts'),
          tabBarLabel: t('nav.shifts', 'Shifts'),
          tabBarAccessibilityLabel: t('nav.shifts', 'Shifts'),
          tabBarTestID: 'tab-shifts',
        })}
      />
      <Tabs.Screen
        name="settings"
        options={tabOptions({
          title: t('nav.settings', 'Settings'),
          tabBarLabel: t('nav.settings', 'Settings'),
          tabBarAccessibilityLabel: t('nav.settings', 'Settings'),
          tabBarTestID: 'tab-settings',
        })}
      />
    </Tabs>
  )
}
