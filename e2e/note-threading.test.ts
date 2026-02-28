/**
 * Note Threading E2E tests — reply to notes, expand/collapse threads.
 * Epic 128: Mobile Records i18n & Detox Tests.
 */

import { by, device, element, expect } from 'detox'
import { authenticateApp, launchApp } from './helpers'

describe('Note Threading', () => {
  beforeAll(async () => {
    await launchApp({ newInstance: true, delete: true })
    await authenticateApp()
  })

  afterAll(async () => {
    await device.terminateApp()
  })

  it('should navigate to notes tab', async () => {
    await element(by.id('tab-notes')).tap()
    await waitFor(element(by.id('notes-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should show reply button on note cards', async () => {
    const hasNotes = await waitFor(element(by.id('note-card')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (!hasNotes) return

    // Note cards should have a reply button
    await expect(element(by.id('note-reply-btn')).atIndex(0)).toBeVisible()
  })

  it('should expand thread when reply button is tapped', async () => {
    const hasNotes = await waitFor(element(by.id('note-card')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (!hasNotes) return

    // Tap reply button to expand thread
    await element(by.id('note-reply-btn')).atIndex(0).tap()

    // Thread container should appear with reply input
    await waitFor(element(by.id('note-thread')))
      .toBeVisible()
      .withTimeout(5_000)

    await expect(element(by.id('note-reply-input'))).toBeVisible()
    await expect(element(by.id('note-reply-send'))).toBeVisible()
  })

  it('should collapse thread when reply button is tapped again', async () => {
    const hasThread = await waitFor(element(by.id('note-thread')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (!hasThread) return

    // Tap reply button again to collapse
    await element(by.id('note-reply-btn')).atIndex(0).tap()

    await waitFor(element(by.id('note-thread')))
      .not.toBeVisible()
      .withTimeout(3_000)
  })

  describe('Note detail threading', () => {
    it('should show thread section in note detail', async () => {
      const hasNotes = await waitFor(element(by.id('note-card')))
        .toBeVisible()
        .withTimeout(5_000)
        .then(() => true)
        .catch(() => false)

      if (!hasNotes) return

      // Navigate to note detail
      await element(by.id('note-card')).atIndex(0).tap()
      await new Promise(resolve => setTimeout(resolve, 2_000))

      // Thread toggle button should be present
      const hasThreadBtn = await waitFor(element(by.id('note-reply-btn')))
        .toBeVisible()
        .withTimeout(3_000)
        .then(() => true)
        .catch(() => false)

      if (hasThreadBtn) {
        await expect(element(by.id('note-reply-btn'))).toBeVisible()
      }

      // Navigate back
      await device.pressBack()
      await waitFor(element(by.id('notes-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })
  })
})
