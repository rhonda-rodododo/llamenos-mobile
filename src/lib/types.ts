/**
 * Shared types used across the mobile app.
 * Subset of llamenos web app's @shared/types.ts.
 */

/** What gets encrypted before storage — replaces plain text */
export interface NotePayload {
  text: string
  fields?: Record<string, string | number | boolean>
}

/** A symmetric key wrapped via ECIES for a single recipient. */
export interface KeyEnvelope {
  wrappedKey: string       // hex: nonce(24) + ciphertext(48 = 32 key + 16 tag)
  ephemeralPubkey: string  // hex: compressed 33-byte pubkey
}

/** A KeyEnvelope tagged with the recipient's pubkey (for multi-recipient scenarios). */
export interface RecipientKeyEnvelope extends KeyEnvelope {
  pubkey: string  // recipient's x-only pubkey (hex)
}

/** Encrypted key data stored locally (PIN-protected nsec) */
export interface EncryptedKeyData {
  salt: string       // hex, 16 bytes
  iterations: number
  nonce: string      // hex, 24 bytes (XChaCha20)
  ciphertext: string // hex
  pubkey: string     // truncated SHA-256 hash of pubkey for identification
}

/** Custom field definition for call notes */
export interface CustomFieldDefinition {
  id: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect'
  options?: string[]
  required?: boolean
  visibleToVolunteers?: boolean
  context?: 'note' | 'report' | 'both'
}

/** User role in the hub */
export type UserRole = 'admin' | 'volunteer' | 'reporter'

/** Auth token for API requests */
export interface AuthToken {
  pubkey: string
  timestamp: number
  token: string
}

/** Hub configuration returned by GET /api/config */
export interface HubConfig {
  name: string
  relayUrl?: string
  serverPubkey?: string
  features?: string[]
  customFields?: CustomFieldDefinition[]
}

// --- API Response Types ---

/** Active call state */
export interface ActiveCall {
  id: string
  status: 'ringing' | 'in-progress' | 'completed'
  callerLast4?: string
  answeredBy?: string
  startedAt: string
  hasTranscription: boolean
  hasVoicemail: boolean
}

/** Historical call record */
export interface CallRecord {
  id: string
  status: 'answered' | 'unanswered' | 'completed'
  startedAt: string
  duration?: number
  callerLast4?: string
  answeredBy?: string
  hasRecording: boolean
  hasVoicemail: boolean
  hasTranscription: boolean
  encryptedContent?: string
  adminEnvelopes?: RecipientKeyEnvelope[]
}

/** Shift definition */
export interface Shift {
  id: string
  name: string
  startTime: string  // HH:MM
  endTime: string    // HH:MM
  days: number[]     // 0=Sun, 1=Mon, ..., 6=Sat
  volunteerPubkeys: string[]
}

/** Shift status for current user */
export interface ShiftStatus {
  onShift: boolean
  currentShift?: Shift
  nextShift?: Shift
}

/** Encrypted note from the API */
export interface EncryptedNote {
  id: string
  callId: string
  authorPubkey: string
  createdAt: string
  updatedAt: string
  encryptedContent: string
  authorEnvelope?: KeyEnvelope
  adminEnvelopes?: RecipientKeyEnvelope[]
  ephemeralPubkey?: string
}

/** Volunteer info */
export interface Volunteer {
  pubkey: string
  name: string
  phone?: string
  active: boolean
  roles: string[]
}

/** Presence summary (non-admin) */
export interface PresenceSummary {
  hasAvailable: boolean
}

/** Presence detail (admin) */
export interface PresenceDetail {
  available: number
  onCall: number
  total: number
}

/** Ban list entry */
export interface BanEntry {
  id: string
  phoneHash: string
  reason?: string
  createdAt: string
  createdBy: string
}

/** Audit log entry */
export interface AuditEntry {
  id: string
  action: string
  actorPubkey: string
  targetPubkey?: string
  details?: string
  createdAt: string
  entryHash?: string
  previousEntryHash?: string
}

/** Conversation (messaging) */
export interface Conversation {
  id: string
  channelType: string
  status: 'waiting' | 'active' | 'closed'
  assignedTo?: string
  contactIdentifier: string
  lastMessageAt?: string
  createdAt: string
}

/** Conversation message */
export interface ConversationMessage {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  encryptedContent: string
  authorEnvelope?: KeyEnvelope
  adminEnvelopes?: RecipientKeyEnvelope[]
  createdAt: string
  status?: string
}

// --- Settings Types ---

/** Telephony provider configuration */
export interface TelephonySettings {
  type: string
  accountSid?: string
  authToken?: string
  apiKeySid?: string
  apiKeySecret?: string
  twimlAppSid?: string
  phoneNumber?: string
  signalwireSpace?: string
  apiKey?: string
  apiSecret?: string
  applicationId?: string
  privateKey?: string
  authId?: string
  ariUrl?: string
  ariUsername?: string
  ariPassword?: string
  bridgeCallbackUrl?: string
  enableWebrtc?: boolean
}

/** Spam protection settings */
export interface SpamSettings {
  captchaEnabled: boolean
  rateLimitEnabled: boolean
  rateLimit: number           // calls per minute
  banDurationMinutes: number
  autoBlockThreshold: number
}

/** Call routing and voicemail settings */
export interface CallSettings {
  queueTimeoutSeconds: number
  voicemailEnabled: boolean
  maxVoicemailSeconds: number
  recordingEnabled: boolean
}

/** Combined hub settings */
export interface HubSettings {
  telephony: TelephonySettings
  spam: SpamSettings
  calls: CallSettings
}

/** Role definition (PBAC) */
export interface Role {
  id: string
  name: string
  slug: string
  permissions: string[]
  isDefault: boolean
  isSystem: boolean
  description: string
  createdAt: string
  updatedAt: string
}
