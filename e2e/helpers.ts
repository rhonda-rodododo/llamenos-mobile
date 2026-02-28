/**
 * Shared E2E test helpers — app launch, authentication, PIN entry.
 * Used by tests that require authenticated app state.
 */

import { by, device, element } from 'detox'

/**
 * Launch the app with sensible defaults for E2E tests.
 * Pre-grants notification permissions on iOS to prevent system dialogs
 * from blocking test interactions.
 */
export async function launchApp(
  options: Parameters<typeof device.launchApp>[0] = {},
) {
  await device.launchApp({
    ...options,
    permissions: {
      notifications: 'YES',
      ...options.permissions,
    },
  })
}

/**
 * Run through the onboarding flow to authenticate the app.
 * Generates a keypair, sets PIN 1111, confirms PIN.
 * Call this in beforeAll after launchApp({ newInstance: true, delete: true }).
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

  // Wait for authenticated state — dashboard screen should appear
  // Note: we wait for 'dashboard-screen' (the screen content) rather than
  // 'tab-dashboard' (the tab button) because the tab bar testIDs may not
  // render immediately in CI. The dashboard screen IS visible after auth.
  await waitFor(element(by.id('dashboard-screen')))
    .toBeVisible()
    .withTimeout(20_000)
}

/**
 * Enter a PIN using the digit inputs.
 * Types each digit into its specific input via keyboard, with a delay
 * between digits to let React process the state update and auto-advance
 * focus to the next input.
 *
 * Why per-digit with delays instead of typing all at once:
 * - typeText('1234') types too fast on iOS — characters arrive before
 *   React's async state update + auto-advance completes, so multiple
 *   characters hit the same input (maxLength=1 drops the first).
 * - Per-digit typeText with delays gives React time to process each
 *   state update and move focus before the next character arrives.
 */
export async function enterPin(pin: string = '1111') {
  await waitFor(element(by.id('pin-digit-0')))
    .toBeVisible()
    .withTimeout(10_000)

  for (let i = 0; i < pin.length; i++) {
    await element(by.id(`pin-digit-${i}`)).typeText(pin[i])
    // Wait for React state update + auto-advance focus
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  // Wait for onComplete to fire and state to settle
  await new Promise(resolve => setTimeout(resolve, 500))
}
