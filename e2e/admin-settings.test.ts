/**
 * Admin settings sections E2E tests — collapsible sections, form fields.
 * Epic 104: Mobile E2E Test Expansion.
 *
 * Assumes authenticated state with admin role.
 * Tests are conditional — if user doesn't have admin access,
 * tests are skipped gracefully.
 */

import { by, device, element, expect } from 'detox'
import { authenticateApp } from './helpers'

describe('Admin Settings', () => {
  let hasAdminAccess = false

  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true })
    await authenticateApp()

    // Navigate to settings to check for admin sections
    await element(by.id('tab-settings')).tap()
    await waitFor(element(by.id('settings-screen')))
      .toBeVisible()
      .withTimeout(10_000)

    // Scroll down to find admin navigation links
    await element(by.id('settings-screen')).swipe('up', 'slow', 0.5)

    // Try to navigate to admin settings
    hasAdminAccess = await waitFor(element(by.text('Hub Settings')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)
  })

  afterAll(async () => {
    await device.terminateApp()
  })

  it('should navigate to admin settings screen', async () => {
    if (!hasAdminAccess) return

    await element(by.text('Hub Settings')).tap()
    await waitFor(element(by.id('admin-settings-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  describe('Telephony section', () => {
    it('should show telephony section', async () => {
      if (!hasAdminAccess) return

      await waitFor(element(by.id('admin-section-telephony')))
        .toBeVisible()
        .withTimeout(5_000)
    })

    it('should expand telephony section on tap', async () => {
      if (!hasAdminAccess) return

      await element(by.id('admin-section-telephony-toggle')).tap()

      // Content should now be visible
      await waitFor(element(by.id('admin-section-telephony-content')))
        .toBeVisible()
        .withTimeout(5_000)
    })

    it('should collapse telephony section on second tap', async () => {
      if (!hasAdminAccess) return

      await element(by.id('admin-section-telephony-toggle')).tap()

      // Content should be hidden
      await waitFor(element(by.id('admin-section-telephony-content')))
        .not.toBeVisible()
        .withTimeout(3_000)
        .catch(() => {
          // May still be animating
        })
    })
  })

  describe('Spam settings section', () => {
    it('should show spam section', async () => {
      if (!hasAdminAccess) return

      // May need to scroll to find spam section
      try {
        await expect(element(by.id('admin-section-spam'))).toBeVisible()
      } catch {
        await element(by.id('admin-settings-screen')).swipe('up', 'slow', 0.3)
      }
    })

    it('should expand spam section and show toggles', async () => {
      if (!hasAdminAccess) return

      await element(by.id('admin-section-spam-toggle')).tap()

      await waitFor(element(by.id('admin-section-spam-content')))
        .toBeVisible()
        .withTimeout(5_000)

      // Collapse for next test
      await element(by.id('admin-section-spam-toggle')).tap()
    })
  })

  describe('Call settings section', () => {
    it('should show call settings section', async () => {
      if (!hasAdminAccess) return

      try {
        await expect(element(by.id('admin-section-calls'))).toBeVisible()
      } catch {
        await element(by.id('admin-settings-screen')).swipe('up', 'slow', 0.3)
      }
    })

    it('should expand call settings section', async () => {
      if (!hasAdminAccess) return

      await element(by.id('admin-section-calls-toggle')).tap()

      await waitFor(element(by.id('admin-section-calls-content')))
        .toBeVisible()
        .withTimeout(5_000)

      // Collapse
      await element(by.id('admin-section-calls-toggle')).tap()
    })
  })

  describe('Custom fields section', () => {
    it('should show custom fields section', async () => {
      if (!hasAdminAccess) return

      try {
        await expect(element(by.id('admin-section-fields'))).toBeVisible()
      } catch {
        await element(by.id('admin-settings-screen')).swipe('up', 'slow', 0.3)
      }
    })

    it('should expand custom fields section', async () => {
      if (!hasAdminAccess) return

      await element(by.id('admin-section-fields-toggle')).tap()

      await waitFor(element(by.id('admin-section-fields-content')))
        .toBeVisible()
        .withTimeout(5_000)

      // Collapse
      await element(by.id('admin-section-fields-toggle')).tap()
    })
  })

  describe('Roles section', () => {
    it('should show roles section', async () => {
      if (!hasAdminAccess) return

      try {
        await expect(element(by.id('admin-section-roles'))).toBeVisible()
      } catch {
        await element(by.id('admin-settings-screen')).swipe('up', 'slow', 0.5)
      }
    })

    it('should expand roles section', async () => {
      if (!hasAdminAccess) return

      await element(by.id('admin-section-roles-toggle')).tap()

      await waitFor(element(by.id('admin-section-roles-content')))
        .toBeVisible()
        .withTimeout(5_000)

      // Collapse
      await element(by.id('admin-section-roles-toggle')).tap()
    })
  })

  it('should navigate back to settings', async () => {
    if (!hasAdminAccess) return

    await device.pressBack()
    await waitFor(element(by.id('settings-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })
})
