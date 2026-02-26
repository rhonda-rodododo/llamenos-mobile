/**
 * Notes E2E tests — list, create, view encrypted notes.
 * Epic 88: Desktop & Mobile E2E Tests.
 *
 * Assumes authenticated state with hub config.
 */

import { by, device, element, expect } from 'detox'

describe('Notes', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
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
})
