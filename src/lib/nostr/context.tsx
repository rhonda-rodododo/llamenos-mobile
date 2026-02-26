/**
 * React context for the Nostr relay connection.
 *
 * Port of web app's context.tsx for React Native:
 * - Removed window.location URL fallback — mobile always uses full URL from hub config
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { RelayManager } from './relay'
import type { RelayState } from './types'

interface NostrContextValue {
  relay: RelayManager | null
  state: RelayState
}

const NostrContext = createContext<NostrContextValue>({
  relay: null,
  state: 'disconnected',
})

interface NostrProviderProps {
  children: ReactNode
  relayUrl: string | undefined
  serverPubkey: string | undefined
  isAuthenticated: boolean
  getSecretKey: () => Uint8Array | null
  getHubKey: () => Uint8Array | null
}

export function NostrProvider({
  children,
  relayUrl,
  serverPubkey,
  isAuthenticated,
  getSecretKey,
  getHubKey,
}: NostrProviderProps) {
  const [state, setState] = useState<RelayState>('disconnected')
  const relayRef = useRef<RelayManager | null>(null)

  const getSecretKeyRef = useRef(getSecretKey)
  getSecretKeyRef.current = getSecretKey
  const getHubKeyRef = useRef(getHubKey)
  getHubKeyRef.current = getHubKey

  useEffect(() => {
    if (!isAuthenticated || !relayUrl || !serverPubkey) {
      if (relayRef.current) {
        relayRef.current.close()
        relayRef.current = null
        setState('disconnected')
      }
      return
    }

    // Mobile always requires a full wss:// URL — no relative URL resolution
    if (!relayUrl.startsWith('ws://') && !relayUrl.startsWith('wss://')) {
      console.error('[nostr] Relay URL must be an absolute WebSocket URL:', relayUrl)
      return
    }

    const manager = new RelayManager({
      relayUrl,
      serverPubkey,
      getSecretKey: () => getSecretKeyRef.current(),
      getHubKey: () => getHubKeyRef.current(),
      onStateChange: setState,
    })

    relayRef.current = manager
    manager.connect().catch(() => {})

    // Network-aware reconnect — reconnect when network comes back online
    const unsubNetInfo = NetInfo.addEventListener(netState => {
      if (netState.isConnected && relayRef.current) {
        if (relayRef.current.getState() === 'disconnected') {
          relayRef.current.connect().catch(() => {})
        }
      }
    })

    return () => {
      unsubNetInfo()
      manager.close()
      relayRef.current = null
      setState('disconnected')
    }
  }, [isAuthenticated, relayUrl, serverPubkey])

  return (
    <NostrContext.Provider value={{ relay: relayRef.current, state }}>
      {children}
    </NostrContext.Provider>
  )
}

export function useRelay(): RelayManager | null {
  return useContext(NostrContext).relay
}

export function useRelayState(): RelayState {
  return useContext(NostrContext).state
}
