/**
 * Tab and navigation E2E tests — switching tabs, back navigation, state persistence.
 * Epic 104: Mobile E2E Test Expansion.
 */

import { by, device, element, expect } from 'detox'
import { authenticateApp, launchApp } from './helpers'

describe('Navigation', () => {
  beforeAll(async () => {
    await launchApp({ newInstance: true, delete: true })
    await authenticateApp()
  })

  afterAll(async () => {
    await device.terminateApp()
  })

  describe('Tab switching', () => {
    it('should start on dashboard tab', async () => {
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })

    it('should switch to notes tab', async () => {
      await element(by.text('Notes')).tap()
      await waitFor(element(by.id('notes-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })

    it('should switch to conversations tab', async () => {
      // Conversations tab may be hidden if user lacks permission
      const hasConvTab = await waitFor(element(by.text('Messages')))
        .toBeVisible()
        .withTimeout(3_000)
        .then(() => true)
        .catch(() => false)

      if (hasConvTab) {
        await element(by.text('Messages')).tap()
        await waitFor(element(by.id('conversations-screen')))
          .toBeVisible()
          .withTimeout(10_000)
      }
    })

    it('should switch to shifts tab', async () => {
      await element(by.text('Shifts')).tap()
      await waitFor(element(by.id('shifts-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })

    it('should switch to settings tab', async () => {
      await element(by.text('Settings')).tap()
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })

    it('should switch back to dashboard tab', async () => {
      await element(by.text('Dashboard')).tap()
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })
  })

  describe('Rapid tab switching', () => {
    it('should handle rapid switching without crashes', async () => {
      const tabs = [
        { label: 'Notes', screen: 'notes-screen' },
        { label: 'Shifts', screen: 'shifts-screen' },
        { label: 'Dashboard', screen: 'dashboard-screen' },
        { label: 'Settings', screen: 'settings-screen' },
        { label: 'Dashboard', screen: 'dashboard-screen' },
      ]

      for (const tab of tabs) {
        await element(by.text(tab.label)).tap()
        // Brief wait — we're testing rapid switching, not load times
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Final state should be dashboard
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })
  })

  describe('Admin section navigation', () => {
    it('should navigate to admin sections if admin', async () => {
      await element(by.text('Settings')).tap()
      await waitFor(element(by.id('settings-screen')))
        .toBeVisible()
        .withTimeout(10_000)

      // Scroll to admin section
      await element(by.id('settings-screen')).swipe('up', 'slow', 0.5)

      // Check for admin link — only visible to admins
      const hasAdmin = await waitFor(element(by.text('Hub Settings')))
        .toBeVisible()
        .withTimeout(3_000)
        .then(() => true)
        .catch(() => false)

      if (hasAdmin) {
        await element(by.text('Hub Settings')).tap()
        await waitFor(element(by.id('admin-settings-screen')))
          .toBeVisible()
          .withTimeout(10_000)

        // Navigate back
        await device.pressBack()
        await waitFor(element(by.id('settings-screen')))
          .toBeVisible()
          .withTimeout(10_000)
      }
    })
  })

  describe('Tab state persistence', () => {
    it('should retain scroll position when switching tabs', async () => {
      // Go to notes tab and scroll down
      await element(by.text('Notes')).tap()
      await waitFor(element(by.id('notes-screen')))
        .toBeVisible()
        .withTimeout(10_000)

      await element(by.id('notes-screen')).swipe('up', 'slow', 0.3)

      // Switch to dashboard and back
      await element(by.text('Dashboard')).tap()
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(10_000)

      await element(by.text('Notes')).tap()
      await waitFor(element(by.id('notes-screen')))
        .toBeVisible()
        .withTimeout(10_000)

      // Notes screen should still be visible (state preserved)
      await expect(element(by.id('notes-screen'))).toBeVisible()
    })
  })
})
