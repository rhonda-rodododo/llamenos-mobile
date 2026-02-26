/**
 * Push notification registration and token management (Epic 86).
 *
 * Registers native APNs/FCM tokens (NOT Expo push tokens) directly with the
 * server. Uses device-specific wake key for two-tier encrypted payloads.
 */

import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as apiClient from './api-client'
import { getOrCreateWakeKey, getWakeKeyPublic } from './wake-key'

/**
 * Request notification permissions and register push token with the server.
 * Call this on app launch after authentication.
 */
export async function registerForPush(): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  // Get native push token (APNs on iOS, FCM on Android)
  const tokenData = await Notifications.getDevicePushTokenAsync()

  // Get or create wake key for two-tier decryption
  const wakeKeyPublic = await getOrCreateWakeKey()

  // Register with server
  await apiClient.api.post('/api/devices/register', {
    platform: Platform.OS as 'ios' | 'android',
    pushToken: tokenData.data,
    wakeKeyPublic,
  })
}

/**
 * Set up a listener for push token refreshes.
 * When the OS rotates the push token, re-register with the server.
 */
export function setupTokenRefreshListener(): Notifications.Subscription {
  return Notifications.addPushTokenListener(async (token) => {
    const wakeKeyPublic = await getWakeKeyPublic()
    if (!wakeKeyPublic) return

    await apiClient.api.post('/api/devices/register', {
      platform: Platform.OS as 'ios' | 'android',
      pushToken: token.data,
      wakeKeyPublic,
    }).catch(() => {}) // Silent — will retry on next app launch
  })
}

/**
 * Unregister all devices for the current user (called on logout).
 */
export async function unregisterDevices(): Promise<void> {
  try {
    await apiClient.api.delete('/api/devices')
  } catch {
    // Best effort — token will become stale eventually
  }
}
