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
 * Waits for the first digit to be visible, then types each digit.
 */
export async function enterPin(pin: string = '1111') {
  await waitFor(element(by.id('pin-digit-0')))
    .toBeVisible()
    .withTimeout(10_000)

  for (let i = 0; i < pin.length; i++) {
    await element(by.id(`pin-digit-${i}`)).tap()
    await element(by.id(`pin-digit-${i}`)).replaceText(pin[i])
  }

  // Brief wait for onComplete to fire and state to settle
  await new Promise(resolve => setTimeout(resolve, 500))
}
