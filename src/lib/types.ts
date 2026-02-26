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
