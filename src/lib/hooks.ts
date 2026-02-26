/**
 * React hooks for core app state — calls, shift status, call timer.
 * Port of web app's hooks.ts adapted for React Native.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNostrSubscription } from './nostr/hooks'
import { KIND_CALL_RING, KIND_CALL_UPDATE, KIND_CALL_VOICEMAIL, KIND_PRESENCE_UPDATE } from './nostr/event-kinds'
import * as apiClient from './api-client'
import type { ActiveCall, ShiftStatus } from './types'
import type { CallRingEvent, CallUpdateEvent, PresenceSummaryEvent } from './nostr/types'

// --- useCalls ---

interface UseCallsReturn {
  calls: ActiveCall[]
  currentCall: ActiveCall | null
  ringingCalls: ActiveCall[]
  activeCalls: ActiveCall[]
  answerCall: (callId: string) => Promise<void>
  hangupCall: (callId: string) => Promise<void>
  reportSpam: (callId: string) => Promise<void>
  loading: boolean
}

export function useCalls(hubId: string | undefined, myPubkey: string | null): UseCallsReturn {
  const [calls, setCalls] = useState<ActiveCall[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  // Fetch active calls (REST polling)
  const fetchCalls = useCallback(async () => {
    try {
      const { calls: activeCalls } = await apiClient.listActiveCalls()
      if (mountedRef.current) setCalls(activeCalls)
    } catch {
      // Silently fail — next poll will retry
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchCalls()
    const interval = setInterval(fetchCalls, 15_000) // Poll every 15s
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchCalls])

  // Nostr real-time updates
  useNostrSubscription(
    hubId,
    [KIND_CALL_RING, KIND_CALL_UPDATE, KIND_CALL_VOICEMAIL],
    useCallback((_event, content) => {
      if (!mountedRef.current) return
      const parsed = content as { type: string } & Record<string, unknown>
      switch (parsed.type) {
        case 'call:ring': {
          const data = parsed as unknown as CallRingEvent
          setCalls(prev => {
            if (prev.some(c => c.id === data.callId)) return prev
            return [...prev, {
              id: data.callId,
              status: 'ringing',
              callerLast4: data.callerLast4,
              startedAt: data.startedAt,
              hasTranscription: false,
              hasVoicemail: false,
            }]
          })
          break
        }
        case 'call:update': {
          const data = parsed as unknown as CallUpdateEvent
          setCalls(prev =>
            prev.map(c =>
              c.id === data.callId
                ? { ...c, status: data.status as ActiveCall['status'], answeredBy: data.answeredBy }
                : c,
            ).filter(c => c.status !== 'completed'),
          )
          break
        }
        case 'call:ended': {
          const data = parsed as unknown as { callId: string }
          setCalls(prev => prev.filter(c => c.id !== data.callId))
          break
        }
      }
    }, []),
  )

  const currentCall = calls.find(c => c.answeredBy === myPubkey && c.status === 'in-progress') ?? null
  const ringingCalls = calls.filter(c => c.status === 'ringing')
  const activeCalls = calls.filter(c => c.status === 'in-progress')

  const answerCall = useCallback(async (callId: string) => {
    setCalls(prev => prev.map(c =>
      c.id === callId ? { ...c, status: 'in-progress' as const, answeredBy: myPubkey ?? undefined } : c,
    ))
    try {
      await apiClient.answerCall(callId)
    } catch {
      fetchCalls() // Revert on failure
    }
  }, [myPubkey, fetchCalls])

  const hangupCall = useCallback(async (callId: string) => {
    setCalls(prev => prev.filter(c => c.id !== callId))
    try {
      await apiClient.hangupCall(callId)
    } catch {
      fetchCalls()
    }
  }, [fetchCalls])

  const reportSpam = useCallback(async (callId: string) => {
    setCalls(prev => prev.filter(c => c.id !== callId))
    try {
      await apiClient.reportCallSpam(callId)
    } catch {
      fetchCalls()
    }
  }, [fetchCalls])

  return { calls, currentCall, ringingCalls, activeCalls, answerCall, hangupCall, reportSpam, loading }
}

// --- useShiftStatus ---

interface UseShiftStatusReturn extends ShiftStatus {
  loading: boolean
  refetch: () => Promise<void>
}

export function useShiftStatus(): UseShiftStatusReturn {
  const [status, setStatus] = useState<ShiftStatus>({ onShift: false })
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    try {
      const data = await apiClient.getMyShiftStatus()
      if (mountedRef.current) setStatus(data)
    } catch {
      // Silently fail
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refetch()
    const interval = setInterval(refetch, 60_000) // Poll every 60s
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [refetch])

  return { ...status, loading, refetch }
}

// --- usePresence ---

export function usePresence(hubId: string | undefined): { hasAvailable: boolean } {
  const [hasAvailable, setHasAvailable] = useState(false)

  useNostrSubscription(
    hubId,
    [KIND_PRESENCE_UPDATE],
    useCallback((_event, content) => {
      const parsed = content as unknown as PresenceSummaryEvent
      if (parsed.type === 'presence:summary') {
        setHasAvailable(parsed.hasAvailable)
      }
    }, []),
  )

  return { hasAvailable }
}

// --- useCallTimer ---

export function useCallTimer(startedAt: string | null): { elapsed: number; formatted: string } {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }

    const startMs = new Date(startedAt).getTime()
    const update = () => setElapsed(Math.floor((Date.now() - startMs) / 1000))
    update()

    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { elapsed, formatted }
}
