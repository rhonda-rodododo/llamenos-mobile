/**
 * Authoritative domain separation constants for all cryptographic operations.
 * Copied from llamenos web app's @shared/crypto-labels.ts.
 *
 * RULES:
 * 1. NEVER use raw string literals for crypto contexts — import from here
 * 2. New crypto operations MUST add a new constant before implementation
 * 3. All constants are prefixed with 'llamenos:' for collision avoidance
 */

// --- ECIES Key Wrapping ---
export const LABEL_NOTE_KEY = 'llamenos:note-key'
export const LABEL_FILE_KEY = 'llamenos:file-key'
export const LABEL_FILE_METADATA = 'llamenos:file-metadata'
export const LABEL_HUB_KEY_WRAP = 'llamenos:hub-key-wrap'

// --- ECIES Content Encryption ---
export const LABEL_TRANSCRIPTION = 'llamenos:transcription'
export const LABEL_MESSAGE = 'llamenos:message'
export const LABEL_CALL_META = 'llamenos:call-meta'
export const LABEL_SHIFT_SCHEDULE = 'llamenos:shift-schedule'

// --- HKDF Derivation ---
export const HKDF_SALT = 'llamenos:hkdf-salt:v1'
export const HKDF_CONTEXT_NOTES = 'llamenos:notes'
export const HKDF_CONTEXT_DRAFTS = 'llamenos:drafts'
export const HKDF_CONTEXT_EXPORT = 'llamenos:export'
export const LABEL_HUB_EVENT = 'llamenos:hub-event'

// --- ECDH Key Agreement ---
export const LABEL_DEVICE_PROVISION = 'llamenos:device-provision'

// --- SAS Verification ---
export const SAS_SALT = 'llamenos:sas'
export const SAS_INFO = 'llamenos:provisioning-sas'

// --- Auth Token ---
export const AUTH_PREFIX = 'llamenos:auth:'

// --- HMAC Domain Separation ---
export const HMAC_PHONE_PREFIX = 'llamenos:phone:'
export const HMAC_IP_PREFIX = 'llamenos:ip:'
export const HMAC_KEYID_PREFIX = 'llamenos:keyid:'
export const HMAC_SUBSCRIBER = 'llamenos:subscriber'
export const HMAC_PREFERENCE_TOKEN = 'llamenos:preference-token'

// --- Recovery / Backup ---
export const RECOVERY_SALT = 'llamenos:recovery'
export const LABEL_BACKUP = 'llamenos:backup'

// --- Server Nostr Identity ---
export const LABEL_SERVER_NOSTR_KEY = 'llamenos:server-nostr-key'
export const LABEL_SERVER_NOSTR_KEY_INFO = 'llamenos:server-nostr-key:v1'

// --- Push Notification Encryption (Epic 86) ---
export const LABEL_PUSH_WAKE = 'llamenos:push-wake'
export const LABEL_PUSH_FULL = 'llamenos:push-full'
