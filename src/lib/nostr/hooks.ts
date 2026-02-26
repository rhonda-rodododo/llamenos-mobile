/**
 * React hooks for Nostr relay subscriptions.
 * Direct port from web app — no changes needed.
 */

import { useEffect, useRef } from 'react'
import { useRelay, useRelayState } from './context'
import type { NostrEventHandler } from './types'

export function useNostrSubscription(
  hubId: string | undefined,
  kinds: number[],
  handler: NostrEventHandler,
  enabled = true,
): void {
  const relay = useRelay()
  const state = useRelayState()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!relay || !hubId || !enabled || state !== 'connected') return

    const subId = relay.subscribe(hubId, kinds, (event, content) => {
      handlerRef.current(event, content)
    })

    return () => {
      relay.unsubscribe(subId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relay, hubId, kinds.join(','), enabled, state])
}
