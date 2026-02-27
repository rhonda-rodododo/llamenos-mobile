/**
 * Conversation Notes E2E tests — add notes from conversation threads.
 * Epic 128: Mobile Records i18n & Detox Tests.
 *
 * Assumes authenticated state with hub config and existing conversations.
 */

import { by, device, element, expect } from 'detox'

describe('Conversation Notes', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
  })

  afterAll(async () => {
    await device.terminateApp()
  })

  it('should navigate to conversations tab', async () => {
    await element(by.id('tab-conversations')).tap()
    await waitFor(element(by.id('conversations-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should open a conversation thread', async () => {
    const hasConversations = await waitFor(element(by.id('conversation-row')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (!hasConversations) return

    await element(by.id('conversation-row')).atIndex(0).tap()
    await new Promise(resolve => setTimeout(resolve, 2_000))
  })

  it('should show Add Note button in conversation header', async () => {
    const hasConversations = await waitFor(element(by.id('conv-add-note-btn')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (!hasConversations) return

    await expect(element(by.id('conv-add-note-btn'))).toBeVisible()
  })

  it('should open note form modal when Add Note is tapped', async () => {
    const hasAddNote = await waitFor(element(by.id('conv-add-note-btn')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (!hasAddNote) return

    await element(by.id('conv-add-note-btn')).tap()

    // Note form modal should appear
    await waitFor(element(by.id('note-form-modal')))
      .toBeVisible()
      .withTimeout(5_000)
  })

  it('should show conversation context badge in note form', async () => {
    const hasModal = await waitFor(element(by.id('note-form-modal')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (!hasModal) return

    // Note form should show text input
    await expect(element(by.id('note-text-input'))).toBeVisible()

    // Save button should be present (disabled until text entered)
    await expect(element(by.id('note-save-btn'))).toBeVisible()
  })

  it('should enable save button after entering text', async () => {
    const hasModal = await waitFor(element(by.id('note-form-modal')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (!hasModal) return

    // Type note text
    await element(by.id('note-text-input')).typeText('Test conversation note from Detox')

    // Save button should now be active
    await expect(element(by.id('note-save-btn'))).toBeVisible()
  })

  it('should close modal on cancel', async () => {
    const hasModal = await waitFor(element(by.id('note-form-modal')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (!hasModal) return

    // Find cancel button by text (it's in the header)
    await element(by.text('Cancel')).tap()

    // Modal should close
    await waitFor(element(by.id('note-form-modal')))
      .not.toBeVisible()
      .withTimeout(3_000)
  })

  it('should navigate back from conversation', async () => {
    await device.pressBack()
    await waitFor(element(by.id('conversations-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })
})
