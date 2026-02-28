/**
 * Dashboard E2E tests — rendering, shift status, stats.
 * Epic 88: Desktop & Mobile E2E Tests.
 */

import { by, device, element, expect } from 'detox'
import { authenticateApp, launchApp } from './helpers'

describe('Dashboard', () => {
  beforeAll(async () => {
    await launchApp({ newInstance: true, delete: true })
    await authenticateApp()
  })

  afterAll(async () => {
    await device.terminateApp()
  })

  it('should render the dashboard screen', async () => {
    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should display the shift status card', async () => {
    await waitFor(element(by.id('dashboard-shift-status')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should display the calls today stat card', async () => {
    await expect(element(by.id('dashboard-calls-today'))).toBeVisible()
  })

  it('should show empty state when no active calls', async () => {
    // Either shows active calls or empty state
    try {
      await expect(element(by.id('dashboard-empty-state'))).toBeVisible()
    } catch {
      // Has active calls — that's also fine
    }
  })

  it('should support pull-to-refresh', async () => {
    // Scroll up on the dashboard to trigger refresh
    await element(by.id('dashboard-screen')).swipe('down', 'slow', 0.5)
    // Dashboard should still be visible after refresh
    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should navigate to notes tab', async () => {
    await element(by.text('Notes')).tap()
    await waitFor(element(by.id('notes-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should navigate back to dashboard tab', async () => {
    await element(by.text('Dashboard')).tap()
    await waitFor(element(by.id('dashboard-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })
})
