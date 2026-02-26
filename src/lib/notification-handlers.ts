/**
 * Notification handlers — background display and tap navigation (Epic 86).
 *
 * Background handler: controls how notifications are displayed when the app
 * is backgrounded (alert, sound, badge).
 *
 * Tap handler: navigates to the relevant screen when the user taps a notification.
 */

import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { decryptWakePayload } from './wake-key'

/**
 * Configure how notifications are displayed when the app is in background/foreground.
 * Must be called early in app lifecycle (before any notifications are received).
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = notification.request.content.data as Record<string, string> | undefined

      // Try to decrypt wake payload for smart display decisions
      let type: string | undefined
      if (data?.encrypted) {
        try {
          const wake = await decryptWakePayload(data.encrypted)
          type = wake.type
        } catch {
          // Wake key decrypt failed — show generic notification
        }
      }

      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: type !== 'shift_reminder', // Quiet for shift reminders
        shouldSetBadge: true,
      }
    },
  })
}

/**
 * Set up tap handler — navigates to the relevant screen when notification is tapped.
 * Returns a subscription that should be cleaned up on unmount.
 */
export function setupNotificationTapHandler(): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data as Record<string, string> | undefined

    if (!data?.encrypted) return

    try {
      const wake = await decryptWakePayload(data.encrypted)

      switch (wake.type) {
        case 'message':
        case 'assignment':
          if (wake.conversationId) {
            router.push(`/conversation/${wake.conversationId}`)
          }
          break
        case 'voicemail':
          if (wake.callId) {
            router.push(`/call/${wake.callId}`)
          }
          break
        case 'shift_reminder':
          router.push('/(tabs)/shifts')
          break
      }
    } catch {
      // Decrypt failed — open app to default screen
    }
  })
}

/**
 * Get the initial notification that launched the app (cold start from notification tap).
 * Call this in root layout to handle navigation from a notification that opened the app.
 */
export async function handleInitialNotification(): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync()
  if (!response) return

  const data = response.notification.request.content.data as Record<string, string> | undefined
  if (!data?.encrypted) return

  try {
    const wake = await decryptWakePayload(data.encrypted)

    switch (wake.type) {
      case 'message':
      case 'assignment':
        if (wake.conversationId) {
          // Small delay to let navigation mount
          setTimeout(() => router.push(`/conversation/${wake.conversationId}`), 500)
        }
        break
      case 'voicemail':
        if (wake.callId) {
          setTimeout(() => router.push(`/call/${wake.callId}`), 500)
        }
        break
      case 'shift_reminder':
        setTimeout(() => router.push('/(tabs)/shifts'), 500)
        break
    }
  } catch {
    // Decrypt failed
  }
}
