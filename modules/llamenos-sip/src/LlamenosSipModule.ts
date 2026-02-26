import { requireOptionalNativeModule } from 'expo-modules-core'
import type { EventSubscription } from 'expo-modules-core'

// --- Types ---

export type MediaEncryptionMode = 'srtp' | 'zrtp' | 'dtls-srtp' | 'none'

export interface SipConfig {
  /** SIP server domain (e.g., "chunderm.twilio.com") */
  domain: string
  /** SIP transport type */
  transport: 'tls' | 'tcp' | 'udp'
  /** SIP username for REGISTER */
  username: string
  /** SIP password/token for REGISTER */
  password: string
  /** Display name for caller ID */
  displayName: string
  /** STUN/TURN servers for NAT traversal */
  iceServers: Array<{ url: string; username?: string; credential?: string }>
  /** Media encryption mode */
  mediaEncryption: MediaEncryptionMode
  /** Preferred audio codec (default: opus) */
  preferredCodec?: string
}

export type CallState =
  | 'idle'
  | 'incoming'
  | 'outgoing'
  | 'connecting'
  | 'connected'
  | 'paused'
  | 'resuming'
  | 'ended'
  | 'error'

export type RegistrationState =
  | 'none'
  | 'registering'
  | 'registered'
  | 'failed'
  | 'unregistering'
  | 'cleared'

export interface CallInfo {
  callId: string
  remoteAddress: string
  displayName: string
  duration: number
  state: CallState
  isMuted: boolean
  isSpeaker: boolean
  mediaEncryption: MediaEncryptionMode
  /** ZRTP Short Authentication String (if ZRTP active) */
  zrtpSas: string | null
}

export interface AudioDevice {
  id: string
  name: string
  type: 'earpiece' | 'speaker' | 'bluetooth' | 'headset' | 'unknown'
}

// --- Event Types ---

export type SipEventMap = {
  onRegistrationState: (event: { state: RegistrationState; reason: string }) => void
  onCallState: (event: { callId: string; state: CallState; info: CallInfo }) => void
  onCallReceived: (event: { callId: string; remoteAddress: string; displayName: string }) => void
  onAudioDeviceChanged: (event: { deviceId: string; deviceName: string }) => void
  onEncryptionChanged: (event: { callId: string; encryption: MediaEncryptionMode; zrtpSas: string | null }) => void
}

// --- Native Module Interface ---

/**
 * LlamenosSip native module — wraps Linphone SDK on iOS and Android.
 * The module itself is an EventEmitter (Expo SDK 52+).
 */
interface LlamenosSipNativeModule {
  /** Subscribe to native SIP events */
  addListener<K extends keyof SipEventMap>(
    eventName: K,
    listener: SipEventMap[K],
  ): EventSubscription
  removeListener<K extends keyof SipEventMap>(
    eventName: K,
    listener: SipEventMap[K],
  ): void
  removeAllListeners(eventName: keyof SipEventMap): void

  /** Initialize Linphone Core with app-specific settings */
  initialize(): Promise<void>

  /** Configure and register with a SIP server */
  register(config: SipConfig): Promise<void>

  /** Unregister from SIP server */
  unregister(): Promise<void>

  /** Answer an incoming call */
  answerCall(callId: string): Promise<void>

  /** Decline an incoming call */
  declineCall(callId: string, reason?: string): Promise<void>

  /** Hang up an active call */
  hangup(callId: string): Promise<void>

  /** Toggle mute on active call */
  setMuted(callId: string, muted: boolean): Promise<void>

  /** Toggle speaker on active call */
  setSpeaker(on: boolean): Promise<void>

  /** Send DTMF tone during active call */
  sendDtmf(callId: string, digit: string): Promise<void>

  /** Put call on hold */
  holdCall(callId: string): Promise<void>

  /** Resume held call */
  resumeCall(callId: string): Promise<void>

  /** Get current active call info, or null if no active call */
  getActiveCall(): Promise<CallInfo | null>

  /** Get list of available audio devices */
  getAudioDevices(): Promise<AudioDevice[]>

  /** Set preferred audio output device */
  setAudioDevice(deviceId: string): Promise<void>

  /** Register for VoIP push notifications (returns platform-specific token) */
  registerVoipPush(): Promise<string>

  /** Get current registration state */
  getRegistrationState(): Promise<RegistrationState>

  /** Clean shutdown of Linphone Core */
  destroy(): Promise<void>
}

// --- Module Loading ---

/** The native SIP module, or null if not available (e.g., Expo Go) */
export const LlamenosSipModule = requireOptionalNativeModule<LlamenosSipNativeModule>('LlamenosSip')

/** Whether native VoIP is available */
export const isVoipAvailable = LlamenosSipModule !== null

/**
 * Load the SIP module, throwing if unavailable.
 * Use this in contexts where VoIP is required (e.g., active call screen).
 */
export function loadSipModule(): LlamenosSipNativeModule {
  if (!LlamenosSipModule) {
    throw new Error('LlamenosSip native module not available. VoIP requires a development build.')
  }
  return LlamenosSipModule
}

/**
 * The module itself is the event emitter (Expo SDK 52+).
 * Use LlamenosSipModule.addListener('onCallState', handler) to subscribe.
 *
 * @example
 * ```ts
 * const sub = sipEventEmitter?.addListener('onCallState', (event) => {
 *   console.log(event.callId, event.state)
 * })
 * // Later: sub.remove()
 * ```
 */
export const sipEventEmitter = LlamenosSipModule
