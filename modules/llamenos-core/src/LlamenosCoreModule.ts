/**
 * TypeScript interface for the LlamenosCore native module (UniFFI bindings).
 *
 * This module wraps the Rust llamenos-core crypto crate via UniFFI-generated
 * Swift/Kotlin bindings, exposed to React Native via Expo Modules.
 *
 * When native bindings are not available (dev builds, web), consumers should
 * fall back to the JS crypto implementation in src/lib/crypto.ts.
 */

import { requireNativeModule } from 'expo-modules-core'

/** UniFFI-generated KeyPair record */
export interface NativeKeyPair {
  secretKeyHex: string
  publicKey: string
  nsec: string
  npub: string
}

/** UniFFI-generated AuthToken record */
export interface NativeAuthToken {
  pubkey: string
  timestamp: number
  token: string
}

/** UniFFI-generated KeyEnvelope record */
export interface NativeKeyEnvelope {
  wrappedKey: string
  ephemeralPubkey: string
}

/** UniFFI-generated RecipientKeyEnvelope record */
export interface NativeRecipientKeyEnvelope {
  pubkey: string
  wrappedKey: string
  ephemeralPubkey: string
}

/** UniFFI-generated EncryptedNote record */
export interface NativeEncryptedNote {
  encryptedContent: string
  authorEnvelope: NativeKeyEnvelope
  adminEnvelopes: NativeRecipientKeyEnvelope[]
}

/** UniFFI-generated EncryptedMessage record */
export interface NativeEncryptedMessage {
  encryptedContent: string
  readerEnvelopes: NativeRecipientKeyEnvelope[]
}

/** UniFFI-generated EncryptedKeyData record */
export interface NativeEncryptedKeyData {
  salt: string
  iterations: number
  nonce: string
  ciphertext: string
  pubkey: string
}

/** The native module API — all functions match UniFFI exports from llamenos-core */
export interface LlamenosCoreInterface {
  // --- Key Management ---
  generateKeypair(): NativeKeyPair
  keypairFromNsec(nsec: string): NativeKeyPair
  getPublicKey(secretKeyHex: string): string
  isValidNsec(nsec: string): boolean

  // --- ECIES Key Wrapping (hex boundary) ---
  randomBytesHex(): string
  eciesWrapKeyHex(keyHex: string, recipientPubkeyHex: string, label: string): NativeKeyEnvelope
  eciesUnwrapKeyHex(envelope: NativeKeyEnvelope, secretKeyHex: string, label: string): string

  // --- Note Encryption ---
  encryptNoteForRecipients(
    payloadJson: string,
    authorPubkey: string,
    adminPubkeys: string[],
  ): NativeEncryptedNote
  decryptNote(
    encryptedContent: string,
    envelope: NativeKeyEnvelope,
    secretKeyHex: string,
  ): string

  // --- Message Encryption ---
  encryptMessageForReaders(plaintext: string, readerPubkeys: string[]): NativeEncryptedMessage
  decryptMessageForReader(
    encryptedContent: string,
    readerEnvelopes: NativeRecipientKeyEnvelope[],
    secretKeyHex: string,
    readerPubkey: string,
  ): string

  // --- Call Record Decryption ---
  decryptCallRecordForReader(
    encryptedContent: string,
    adminEnvelopes: NativeRecipientKeyEnvelope[],
    secretKeyHex: string,
    readerPubkey: string,
  ): string

  // --- Draft Encryption ---
  encryptDraft(plaintext: string, secretKeyHex: string): string
  decryptDraft(packedHex: string, secretKeyHex: string): string

  // --- PIN Key Storage ---
  encryptWithPin(nsec: string, pin: string, pubkeyHex: string): NativeEncryptedKeyData
  decryptWithPin(data: NativeEncryptedKeyData, pin: string): string
  isValidPin(pin: string): boolean
  deriveKekHex(pin: string, saltHex: string): string

  // --- Auth ---
  createAuthToken(
    secretKeyHex: string,
    timestamp: number,
    method: string,
    path: string,
  ): NativeAuthToken
  verifyAuthToken(token: NativeAuthToken, method: string, path: string): boolean
  verifySchnorr(messageHex: string, signatureHex: string, pubkeyHex: string): boolean
}

/**
 * Load the native module. Returns null if native bindings are not available
 * (e.g., Expo Go, web, or before the native library is built).
 */
function loadNativeModule(): LlamenosCoreInterface | null {
  try {
    return requireNativeModule<LlamenosCoreInterface>('LlamenosCore')
  } catch {
    return null
  }
}

export const LlamenosCoreModule = loadNativeModule()
