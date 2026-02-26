/**
 * Nostr client types for the Llamenos relay integration.
 * Direct port from web app — no changes needed.
 */

import type { Event as NostrEvent } from 'nostr-tools/core'

export interface LlamenosEvent {
  type: string
  [key: string]: unknown
}

export interface CallRingEvent extends LlamenosEvent {
  type: 'call:ring'
  callId: string
  callerLast4?: string
  startedAt: string
}

export interface CallAnsweredEvent extends LlamenosEvent {
  type: 'call:answered'
  callId: string
  volunteerPubkey: string
}

export interface CallEndedEvent extends LlamenosEvent {
  type: 'call:ended'
  callId: string
}

export interface CallUpdateEvent extends LlamenosEvent {
  type: 'call:update'
  callId: string
  status: string
  answeredBy?: string
}

export interface VoicemailEvent extends LlamenosEvent {
  type: 'voicemail:new'
  callId: string
  startedAt: string
}

export interface PresenceSummaryEvent extends LlamenosEvent {
  type: 'presence:summary'
  hasAvailable: boolean
}

export interface PresenceDetailEvent extends LlamenosEvent {
  type: 'presence:detail'
  available: number
  onCall: number
  total: number
}

export interface MessageNewEvent extends LlamenosEvent {
  type: 'message:new'
  conversationId: string
  channelType: string
}

export interface ConversationAssignedEvent extends LlamenosEvent {
  type: 'conversation:assigned'
  conversationId: string
  assignedTo: string
}

export interface ConversationClosedEvent extends LlamenosEvent {
  type: 'conversation:closed'
  conversationId: string
}

export interface ConversationNewEvent extends LlamenosEvent {
  type: 'conversation:new'
  conversationId: string
}

export interface MessageStatusEvent extends LlamenosEvent {
  type: 'message:status'
  conversationId: string
  messageId: string
  status: string
}

export type RelayState = 'disconnected' | 'connecting' | 'connected' | 'authenticating'

export type NostrEventHandler = (event: NostrEvent, content: LlamenosEvent) => void
