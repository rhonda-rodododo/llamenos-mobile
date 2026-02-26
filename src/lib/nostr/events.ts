/**
 * Nostr event creation, validation, and deduplication.
 * Direct port from web app — no changes needed.
 */

import { finalizeEvent, verifyEvent } from 'nostr-tools/pure'
import type { EventTemplate, VerifiedEvent, Event as NostrEvent } from 'nostr-tools/core'
import type { LlamenosEvent } from './types'

const MAX_EVENT_AGE = 5 * 60 * 1000

export class EventDeduplicator {
  private buckets = new Map<number, Set<string>>()
  private cleanupTimer: ReturnType<typeof setInterval>

  constructor() {
    this.cleanupTimer = setInterval(() => this.prune(), 60_000)
  }

  private getBucketKey(timestampMs: number): number {
    return Math.floor(timestampMs / 60_000)
  }

  isNew(event: { id: string; created_at: number }): boolean {
    const eventTimeMs = event.created_at * 1000
    const age = Date.now() - eventTimeMs
    if (age > MAX_EVENT_AGE) return false

    const bucketKey = this.getBucketKey(eventTimeMs)
    let bucket = this.buckets.get(bucketKey)
    if (bucket?.has(event.id)) return false

    if (!bucket) {
      bucket = new Set()
      this.buckets.set(bucketKey, bucket)
    }
    bucket.add(event.id)
    return true
  }

  private prune(): void {
    const cutoff = this.getBucketKey(Date.now() - MAX_EVENT_AGE)
    for (const [key] of this.buckets) {
      if (key < cutoff) this.buckets.delete(key)
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer)
    this.buckets.clear()
  }
}

export function createHubEvent(
  hubId: string,
  kind: number,
  encryptedContent: string,
  secretKey: Uint8Array,
): VerifiedEvent {
  const template: EventTemplate = {
    kind,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', hubId],
      ['t', 'llamenos:event'],
    ],
    content: encryptedContent,
  }
  return finalizeEvent(template, secretKey)
}

export function validateLlamenosEvent(event: NostrEvent): boolean {
  if (!verifyEvent(event)) return false
  const hasDTag = event.tags.some(t => t[0] === 'd')
  const hasTTag = event.tags.some(t => t[0] === 't' && t[1] === 'llamenos:event')
  return hasDTag && hasTTag
}

export function parseLlamenosContent(decrypted: string | null): LlamenosEvent | null {
  if (!decrypted) return null
  try {
    const parsed = JSON.parse(decrypted)
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.type === 'string') {
      return parsed as LlamenosEvent
    }
  } catch {
    // Invalid JSON
  }
  return null
}
