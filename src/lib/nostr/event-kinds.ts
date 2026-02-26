/**
 * Nostr event kind definitions for Llamenos.
 * Copied from web app's src/shared/nostr-events.ts.
 */

// --- Regular Events (persisted) ---
export const KIND_CALL_RING = 1000
export const KIND_CALL_UPDATE = 1001
export const KIND_CALL_VOICEMAIL = 1002
export const KIND_MESSAGE_NEW = 1010
export const KIND_CONVERSATION_ASSIGNED = 1011
export const KIND_SHIFT_UPDATE = 1020
export const KIND_SETTINGS_CHANGED = 1030

// --- Ephemeral Events (not persisted, broadcast only) ---
export const KIND_PRESENCE_UPDATE = 20000
export const KIND_CALL_SIGNAL = 20001

// --- NIP-42 Auth (standard) ---
export const KIND_NIP42_AUTH = 22242
