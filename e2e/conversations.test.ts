/**
 * Conversations tab E2E tests — list, refresh, open thread.
 * Epic 104: Mobile E2E Test Expansion.
 *
 * Assumes authenticated state with hub config.
 */

import { by, device, element, expect } from 'detox'

describe('Conversations', () => {
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

  it('should show conversations list or empty state', async () => {
    const hasConversations = await waitFor(element(by.id('conversation-row')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (!hasConversations) {
      await expect(element(by.id('conversations-empty-state'))).toBeVisible()
    }
  })

  it('should support pull-to-refresh on conversations', async () => {
    await element(by.id('conversations-screen')).swipe('down', 'slow', 0.5)
    await waitFor(element(by.id('conversations-screen')))
      .toBeVisible()
      .withTimeout(10_000)
  })

  it('should open a conversation thread when tapped', async () => {
    const hasConversations = await waitFor(element(by.id('conversation-row')))
      .toBeVisible()
      .withTimeout(5_000)
      .then(() => true)
      .catch(() => false)

    if (hasConversations) {
      // Tap the first conversation row
      await element(by.id('conversation-row')).atIndex(0).tap()

      // Should navigate to conversation thread — verify no crash
      // The conversation thread may show messages or empty state
      await new Promise(resolve => setTimeout(resolve, 2_000))

      // Navigate back
      await device.pressBack()

      // Should return to conversations screen
      await waitFor(element(by.id('conversations-screen')))
        .toBeVisible()
        .withTimeout(10_000)
    }
  })

  it('should scroll through conversations list', async () => {
    const hasConversations = await waitFor(element(by.id('conversation-row')))
      .toBeVisible()
      .withTimeout(3_000)
      .then(() => true)
      .catch(() => false)

    if (hasConversations) {
      await element(by.id('conversations-screen')).swipe('up', 'slow', 0.5)
      await element(by.id('conversations-screen')).swipe('down', 'slow', 0.5)
    }
  })
})
