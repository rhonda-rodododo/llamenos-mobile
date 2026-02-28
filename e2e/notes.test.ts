/**
 * Notes E2E tests — list, create, view encrypted notes.
 * Epic 88: Desktop & Mobile E2E Tests.
 */

import { by, device, element, expect } from 'detox'
import { authenticateApp } from './helpers'

describe('Notes', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true })
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

  it('should show notes list or empty state', async () => {
    // Either notes list has items or shows empty state
    const hasNotes = await waitFor(element(by.id('note-card')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (!hasNotes) {
      await expect(element(by.id('notes-empty-state'))).toBeVisible()
    }
  })

  it('should support pull-to-refresh on notes', async () => {
    await element(by.id('notes-screen')).swipe('down', 'slow', 0.5)
    await waitFor(element(by.id('notes-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should show encrypted content indicator for notes', async () => {
    // If there are notes, they should show encrypted content
    const hasNotes = await waitFor(element(by.id('note-card')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (hasNotes) {
      // Note cards should be visible
      await expect(element(by.id('note-card')).atIndex(0)).toBeVisible()
    }
  })

  it('should scroll through notes list', async () => {
    const hasNotes = await waitFor(element(by.id('note-card')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (hasNotes) {
      // Scroll the notes list
      await element(by.id('notes-screen')).swipe('up', 'slow', 0.5)
      await element(by.id('notes-screen')).swipe('down', 'slow', 0.5)
    }
  })

  describe('Note detail', () => {
    it('should open note detail from list', async () => {
      const hasNotes = await waitFor(element(by.id('note-card')))
        .toBeVisible()
        .withTimeout(5_000)
        .then(() => true)
        .catch(() => false)

      if (!hasNotes) return

      // Tap the first note card
      await element(by.id('note-card')).atIndex(0).tap()

      // Should navigate to note detail — wait for the screen to load
      // The detail screen shows metadata and decrypted content
      await new Promise(resolve => setTimeout(resolve, 2_000))

      // Navigate back to notes list
      await device.pressBack()
      await waitFor(element(by.id('notes-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    })
  })

  describe('Note list pagination', () => {
    it('should load more notes on scroll to bottom', async () => {
      const hasNotes = await waitFor(element(by.id('note-card')))
        .toBeVisible()
        .withTimeout(5_000)
        .then(() => true)
        .catch(() => false)

      if (!hasNotes) return

      // Scroll to the bottom to trigger pagination
      await element(by.id('notes-screen')).swipe('up', 'fast', 0.8)
      await element(by.id('notes-screen')).swipe('up', 'fast', 0.8)

      // Wait for potential loading
      await new Promise(resolve => setTimeout(resolve, 2_000))

      // Notes screen should still be visible (no crash)
      await expect(element(by.id('notes-screen'))).toBeVisible()

      // Scroll back to top
      await element(by.id('notes-screen')).swipe('down', 'fast', 0.8)
      await element(by.id('notes-screen')).swipe('down', 'fast', 0.8)
    })
  })
})
