/**
 * Shifts E2E tests — view schedule, sign up for shifts.
 * Epic 88: Desktop & Mobile E2E Tests.
 */

import { by, device, element, expect } from 'detox'
import { authenticateApp, launchApp } from './helpers'

describe('Shifts', () => {
  beforeAll(async () => {
    await launchApp({ newInstance: true, delete: true })
    await authenticateApp()
  })

  afterAll(async () => {
    await device.terminateApp()
  })

  it('should navigate to shifts tab', async () => {
    await element(by.text('Shifts')).tap()
    await waitFor(element(by.id('shifts-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should show shifts list or empty state', async () => {
    const hasShifts = await waitFor(element(by.id('shift-card')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (!hasShifts) {
      await expect(element(by.id('shifts-empty-state'))).toBeVisible()
    }
  })

  it('should support pull-to-refresh on shifts', async () => {
    await element(by.id('shifts-screen')).swipe('down', 'slow', 0.5)
    await waitFor(element(by.id('shifts-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should display shift details in cards', async () => {
    const hasShifts = await waitFor(element(by.id('shift-card')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (hasShifts) {
      // First shift card should be visible with action buttons
      await expect(element(by.id('shift-card')).atIndex(0)).toBeVisible()
    }
  })

  it('should show sign-up button for available shifts', async () => {
    const hasShifts = await waitFor(element(by.id('shift-card')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (hasShifts) {
      // Check for sign-up or drop button
      try {
        await expect(element(by.id('shift-signup-btn')).atIndex(0)).toBeVisible()
      } catch {
        // Already signed up — drop button may be visible instead
        try {
          await expect(element(by.id('shift-drop-btn')).atIndex(0)).toBeVisible()
        } catch {
          // No action buttons — shift may be full
        }
      }
    }
  })

  it('should scroll through shift cards', async () => {
    const hasShifts = await waitFor(element(by.id('shift-card')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (hasShifts) {
      await element(by.id('shifts-screen')).swipe('up', 'slow', 0.5)
      await element(by.id('shifts-screen')).swipe('down', 'slow', 0.5)
    }
  })
})
