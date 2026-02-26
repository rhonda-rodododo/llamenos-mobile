/**
 * VoIP hook and initialization for native SIP calling via Linphone SDK.
 *
 * Provides:
 * - useVoip() — React hook for VoIP state and call controls
 * - initializeVoip() — One-time setup (called from app root)
 * - connectVoip() — Register with SIP server when volunteer goes on shift
 * - disconnectVoip() — Unregister when going off shift
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { Platform, AppState } from 'react-native'
import {
  LlamenosSipModule,
  isVoipAvailable,
} from '../../modules/llamenos-sip'
import type {
  CallState,
  RegistrationState,
  CallInfo,
  AudioDevice,
} from '../../modules/llamenos-sip'
import { getSipConfig, registerVoipPushToken, unregisterVoipPushToken } from './voip-config'

// Re-export for convenience
export { isVoipAvailable }
export type { CallState, RegistrationState, CallInfo, AudioDevice }

// --- Module-level state ---

let initialized = false

/**
 * Initialize Linphone Core. Call once at app startup.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initializeVoip(): Promise<void> {
  if (!isVoipAvailable || initialized) return

  try {
    await LlamenosSipModule!.initialize()
    initialized = true

    // Register VoIP push token
    const token = await LlamenosSipModule!.registerVoipPush()
    if (token && token !== 'fcm-pending') {
      await registerVoipPushToken(token, Platform.OS as 'ios' | 'android')
    }
  } catch (error) {
    console.warn('[VoIP] Initialization failed:', error)
  }
}

/**
 * Register with the SIP server. Call when volunteer starts a shift
 * or changes call preference to include VoIP.
 */
export async function connectVoip(): Promise<void> {
  if (!isVoipAvailable || !initialized) return

  try {
    const config = await getSipConfig()
    await LlamenosSipModule!.register(config)
  } catch (error) {
    console.warn('[VoIP] SIP registration failed:', error)
    throw error
  }
}

/**
 * Unregister from SIP server. Call when volunteer ends shift
 * or switches to phone-only mode.
 */
export async function disconnectVoip(): Promise<void> {
  if (!isVoipAvailable || !initialized) return

  try {
    await LlamenosSipModule!.unregister()
  } catch (error) {
    console.warn('[VoIP] SIP unregistration failed:', error)
  }
}

/**
 * Clean shutdown of VoIP subsystem. Call on app termination or logout.
 */
export async function destroyVoip(): Promise<void> {
  if (!isVoipAvailable || !initialized) return

  try {
    await unregisterVoipPushToken()
    await LlamenosSipModule!.destroy()
    initialized = false
  } catch (error) {
    console.warn('[VoIP] Shutdown error:', error)
  }
}

// --- React Hook ---

interface VoipState {
  /** Whether native VoIP is available on this device */
  available: boolean
  /** SIP registration state */
  registrationState: RegistrationState
  /** Current active call, or null */
  activeCall: CallInfo | null
  /** Available audio output devices */
  audioDevices: AudioDevice[]
}

interface VoipActions {
  /** Answer an incoming call */
  answerCall: (callId: string) => Promise<void>
  /** Decline an incoming call */
  declineCall: (callId: string) => Promise<void>
  /** Hang up the active call */
  hangup: (callId: string) => Promise<void>
  /** Toggle mute */
  toggleMute: (callId: string) => Promise<void>
  /** Toggle speaker */
  toggleSpeaker: () => Promise<void>
  /** Send DTMF digit */
  sendDtmf: (callId: string, digit: string) => Promise<void>
  /** Put call on hold */
  holdCall: (callId: string) => Promise<void>
  /** Resume held call */
  resumeCall: (callId: string) => Promise<void>
  /** Switch audio output device */
  setAudioDevice: (deviceId: string) => Promise<void>
}

/**
 * React hook providing VoIP state and call controls.
 *
 * Listens to native Linphone events and provides a reactive interface
 * for the call screen and dashboard.
 */
export function useVoip(): VoipState & VoipActions {
  const [registrationState, setRegistrationState] = useState<RegistrationState>('none')
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const mountedRef = useRef(true)

  // Subscribe to native events (NativeModule IS the EventEmitter in Expo SDK 52+)
  useEffect(() => {
    if (!LlamenosSipModule) return

    const regSub = LlamenosSipModule.addListener(
      'onRegistrationState',
      (event) => {
        if (mountedRef.current) {
          setRegistrationState(event.state)
        }
      },
    )

    const callSub = LlamenosSipModule.addListener(
      'onCallState',
      (event) => {
        if (!mountedRef.current) return
        if (event.state === 'ended' || event.state === 'idle' || event.state === 'error') {
          setActiveCall(null)
        } else {
          setActiveCall(event.info)
        }
      },
    )

    const deviceSub = LlamenosSipModule.addListener(
      'onAudioDeviceChanged',
      () => {
        if (mountedRef.current) {
          refreshAudioDevices()
        }
      },
    )

    // Initial state sync
    syncCurrentState()

    return () => {
      mountedRef.current = false
      regSub.remove()
      callSub.remove()
      deviceSub.remove()
    }
  }, [])

  // Re-sync when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mountedRef.current) {
        syncCurrentState()
      }
    })
    return () => sub.remove()
  }, [])

  const syncCurrentState = useCallback(async () => {
    if (!LlamenosSipModule) return
    try {
      const [regState, call, devices] = await Promise.all([
        LlamenosSipModule.getRegistrationState(),
        LlamenosSipModule.getActiveCall(),
        LlamenosSipModule.getAudioDevices(),
      ])
      if (mountedRef.current) {
        setRegistrationState(regState)
        setActiveCall(call)
        setAudioDevices(devices)
      }
    } catch {
      // Core might not be initialized yet
    }
  }, [])

  const refreshAudioDevices = useCallback(async () => {
    if (!LlamenosSipModule) return
    try {
      const devices = await LlamenosSipModule.getAudioDevices()
      if (mountedRef.current) setAudioDevices(devices)
    } catch {
      // Ignore
    }
  }, [])

  // --- Actions ---

  const answerCall = useCallback(async (callId: string) => {
    await LlamenosSipModule?.answerCall(callId)
  }, [])

  const declineCall = useCallback(async (callId: string) => {
    await LlamenosSipModule?.declineCall(callId)
  }, [])

  const hangup = useCallback(async (callId: string) => {
    await LlamenosSipModule?.hangup(callId)
  }, [])

  const toggleMute = useCallback(async (callId: string) => {
    if (!activeCall) return
    await LlamenosSipModule?.setMuted(callId, !activeCall.isMuted)
  }, [activeCall])

  const toggleSpeaker = useCallback(async () => {
    if (!activeCall) return
    await LlamenosSipModule?.setSpeaker(!activeCall.isSpeaker)
  }, [activeCall])

  const sendDtmf = useCallback(async (callId: string, digit: string) => {
    await LlamenosSipModule?.sendDtmf(callId, digit)
  }, [])

  const holdCall = useCallback(async (callId: string) => {
    await LlamenosSipModule?.holdCall(callId)
  }, [])

  const resumeCall = useCallback(async (callId: string) => {
    await LlamenosSipModule?.resumeCall(callId)
  }, [])

  const setAudioDevice = useCallback(async (deviceId: string) => {
    await LlamenosSipModule?.setAudioDevice(deviceId)
  }, [])

  return {
    available: isVoipAvailable,
    registrationState,
    activeCall,
    audioDevices,
    answerCall,
    declineCall,
    hangup,
    toggleMute,
    toggleSpeaker,
    sendDtmf,
    holdCall,
    resumeCall,
    setAudioDevice,
  }
}
