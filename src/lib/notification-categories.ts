/**
 * Notification category setup for iOS action buttons (Epic 86).
 *
 * Categories define action buttons that appear on notifications.
 * Android handles this via notification channels in app.json.
 */

import * as Notifications from 'expo-notifications'

export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('message', [
    {
      identifier: 'open',
      buttonTitle: 'Open',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'markRead',
      buttonTitle: 'Mark Read',
      options: { opensAppToForeground: false },
    },
  ])

  await Notifications.setNotificationCategoryAsync('voicemail', [
    {
      identifier: 'open',
      buttonTitle: 'Listen',
      options: { opensAppToForeground: true },
    },
  ])

  await Notifications.setNotificationCategoryAsync('shift', [
    {
      identifier: 'open',
      buttonTitle: 'View Shifts',
      options: { opensAppToForeground: true },
    },
  ])
}
