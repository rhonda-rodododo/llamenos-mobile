/**
 * Shared E2E test helpers — authentication, PIN entry.
 * Used by tests that require authenticated app state.
 */

import { by, device, element } from 'detox'

/**
 * Run through the onboarding flow to authenticate the app.
 * Generates a keypair, sets PIN 1111, confirms PIN.
 * Call this in beforeAll after device.launchApp({ newInstance: true, delete: true }).
 */
export async function authenticateApp() {
  // Navigate to onboarding via deep link
  await device.openURL({ url: 'llamenos://onboarding' })
  await waitFor(element(by.id('onboarding-screen')))
    .toBeVisible()
    .withTimeout(10_000)

  // Generate keypair
  await element(by.id('onboarding-generate-btn')).tap()
  await waitFor(element(by.id('onboarding-confirm-backup-btn')))
    .toBeVisible()
    .withTimeout(10_000)
  await element(by.id('onboarding-confirm-backup-btn')).tap()

  // Set PIN: 1111
  await enterPin('1111')

  // Confirm PIN: 1111
  await enterPin('1111')

  // Wait for authenticated state — tabs should appear
  await waitFor(element(by.id('tab-dashboard')))
    .toBeVisible()
    .withTimeout(15_000)
}

/**
 * Enter a PIN using the digit inputs.
 * Types all digits at once into the first input — the PinInput component's
 * auto-advance mechanism (onChangeText → focus next) distributes each
 * character to the correct input. Detox/Espresso idle-syncs between
 * characters, giving React time to process state updates.
 *
 * This avoids per-digit tap+type which causes race conditions:
 * tapping an already-focused input triggers selectTextOnFocus + re-render,
 * which can drop the subsequent typeText character.
 */
export async function enterPin(pin: string = '1111') {
  await waitFor(element(by.id('pin-digit-0')))
    .toBeVisible()
    .withTimeout(10_000)

  // Type all digits at once — auto-advance distributes them across inputs
  await element(by.id('pin-digit-0')).typeText(pin)

  // Wait for onComplete to fire and state to settle
  await new Promise(resolve => setTimeout(resolve, 500))
}
