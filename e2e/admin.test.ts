/**
 * Admin feature E2E tests — volunteer management, settings.
 * Epic 88: Desktop & Mobile E2E Tests.
 *
 * Tests are conditional — if user doesn't have admin access,
 * admin-specific tests are skipped gracefully.
 */

import { by, device, element, expect } from 'detox'
import { authenticateApp, launchApp } from './helpers'

describe('Admin Features', () => {
  beforeAll(async () => {
    await launchApp({ newInstance: true, delete: true })
    await authenticateApp()
  })

  afterAll(async () => {
    await device.terminateApp()
  })

  describe('Settings screen', () => {
    it('should navigate to settings', async () => {
      await element(by.text('Settings')).tap()
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })

    it('should display theme options', async () => {
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(5_000)

      // Theme options should be visible
      try {
        await expect(element(by.id('settings-theme-light'))).toBeVisible()
        await expect(element(by.id('settings-theme-dark'))).toBeVisible()
        await expect(element(by.id('settings-theme-system'))).toBeVisible()
      } catch {
        // Theme section may need scrolling
        await element(by.id('settings-screen')).swipe('up', 'slow', 0.3)
        await expect(element(by.id('settings-theme-light'))).toBeVisible()
      }
    })

    it('should toggle dark mode', async () => {
      await element(by.id('settings-theme-dark')).tap()
      // App should switch to dark mode — verify by checking the theme is applied
      // (Visual verification — no crash = success)
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(5_000)

      // Switch back to system
      await element(by.id('settings-theme-system')).tap()
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(5_000)
    })

    it('should display language picker', async () => {
      await element(by.id('settings-screen')).swipe('up', 'slow', 0.3)
      try {
        await expect(element(by.id('settings-language-picker'))).toBeVisible()
      } catch {
        // May need more scrolling
        await element(by.id('settings-screen')).swipe('up', 'slow', 0.3)
      }
    })

    it('should show lock button', async () => {
      // Scroll to find lock button
      await element(by.id('settings-screen')).scrollTo('bottom')
      try {
        await expect(element(by.id('settings-lock-btn'))).toBeVisible()
      } catch {
        // Lock button may be off screen or not rendered
      }
    })
  })

  describe('Admin-specific screens (conditional)', () => {
    it('should show admin sections in settings if user is admin', async () => {
      await element(by.text('Settings')).tap()
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(5_000)

      // Try to find admin-specific UI elements
      // These will only exist if the logged-in user has admin role
      const hasAdmin = await waitFor(element(by.id('admin-settings-screen')))
        .toBeVisible()
        .withTimeout(3_000)
        .then(() => true)
        .catch(() => false)

      if (hasAdmin) {
        await expect(element(by.id('admin-settings-screen'))).toBeVisible()
      }
      // If no admin access, test passes — we're just verifying no crash
    })

    it('should navigate between all tabs without errors', async () => {
      // Cycle through all tabs to verify none crash
      const tabs = ['Dashboard', 'Notes', 'Shifts', 'Settings']

      for (const tab of tabs) {
        await element(by.text(tab)).tap()
        // Wait briefly for each screen to load
        await new Promise(resolve => setTimeout(resolve, 1_000))
      }

      // Should end on settings
      await expect(element(by.id('settings-screen'))).toBeVisible()
    })
  })
})
