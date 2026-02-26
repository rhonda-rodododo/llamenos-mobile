/**
 * Haptic feedback utility with semantic methods (Epic 89).
 *
 * Maps volunteer actions to appropriate haptic patterns.
 * Falls back silently on devices without haptic hardware.
 */

import * as Haptics from 'expo-haptics'

export const haptic = {
  /** Light: button taps, list item selection, pull-to-refresh */
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** Medium: call answer, note save, shift sign-up */
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  /** Heavy: panic wipe trigger, destructive actions */
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
  /** Warning: shift drop, ban add, volunteer deactivation */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  /** Success: message sent, settings saved */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** Error: auth failure, decryption failure */
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  /** Selection: toggling options, picker changes */
  selection: () => Haptics.selectionAsync().catch(() => {}),
}
