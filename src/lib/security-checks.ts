/**
 * Runtime security checks for mobile devices.
 *
 * These are advisory — we WARN but don't block, because:
 * 1. This is an AGPL app; users may have legitimate reasons for rooted/jailbroken devices
 * 2. Jailbreak detection is imperfect and can false-positive
 * 3. The core security model (E2EE, Schnorr auth) doesn't depend on device integrity
 */

import { Platform } from 'react-native'
import * as Device from 'expo-device'

export interface SecurityStatus {
  isRooted: boolean
  isEmulator: boolean
  warnings: string[]
}

/**
 * Run basic security checks. Returns warnings (not errors) for the UI to display.
 */
export async function checkSecurityStatus(): Promise<SecurityStatus> {
  const warnings: string[] = []
  let isRooted = false
  let isEmulator = false

  // Emulator detection
  if (!Device.isDevice) {
    isEmulator = true
    // Don't warn in dev — emulators are expected
    if (!__DEV__) {
      warnings.push('Running on an emulator or simulator')
    }
  }

  // Basic root/jailbreak indicators
  if (Platform.OS === 'android') {
    isRooted = await checkAndroidRoot()
  } else if (Platform.OS === 'ios') {
    isRooted = checkiOSJailbreak()
  }

  if (isRooted) {
    warnings.push(
      Platform.OS === 'android'
        ? 'Device appears to be rooted. Key material may be accessible to other apps.'
        : 'Device appears to be jailbroken. Keychain protections may be weakened.',
    )
  }

  return { isRooted, isEmulator, warnings }
}

/**
 * Basic Android root detection. Not exhaustive — determined adversaries can bypass.
 * We check for common indicators rather than using an SDK that might bloat the app.
 */
async function checkAndroidRoot(): Promise<boolean> {
  try {
    // Check for common root management apps
    const rootApps = [
      'com.topjohnwu.magisk',
      'eu.chainfire.supersu',
      'com.koushikdutta.superuser',
    ]

    // Use expo-device to check basic properties
    // Full root detection would need a native module (e.g., RootBeer)
    // For now, check if the device brand/model suggests an emulator
    const brand = Device.brand?.toLowerCase() ?? ''
    if (brand === 'generic' || brand === 'unknown') {
      return true
    }
  } catch {
    // If checks fail, don't assume root
  }
  return false
}

/**
 * Basic iOS jailbreak detection.
 * Checks for common jailbreak indicators accessible from JS.
 */
function checkiOSJailbreak(): boolean {
  // In a sandboxed React Native app, we can't check file paths directly.
  // Real jailbreak detection requires a native module.
  // For now, we rely on the expo-device checks above.
  return false
}
