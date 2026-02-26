/**
 * Tab navigator layout for authenticated screens.
 * Bottom tabs: Dashboard, Shifts, Notes, Settings.
 */

import { Tabs } from 'expo-router'
import { useTranslation } from 'react-i18next'

export default function TabsLayout() {
  const { t } = useTranslation()

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#2563eb', // primary blue
        tabBarInactiveTintColor: '#6b7280', // muted gray
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
        name="shifts"
        options={{
          title: t('nav.shifts', 'Shifts'),
          tabBarLabel: t('nav.shifts', 'Shifts'),
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
        name="settings"
        options={{
          title: t('nav.settings', 'Settings'),
          tabBarLabel: t('nav.settings', 'Settings'),
        }}
      />
    </Tabs>
  )
}
