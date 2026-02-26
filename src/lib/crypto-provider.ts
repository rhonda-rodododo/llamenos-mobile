/**
 * Platform-aware crypto provider.
 *
 * Tries to use native Rust crypto via UniFFI (llamenos-core Expo Module).
 * Falls back to JS crypto (@noble/*) when native bindings are unavailable.
 *
 * This abstraction allows the app to work in all environments:
 * - Development builds with native libs: uses Rust (fast, auditable)
 * - Expo Go / dev without native libs: uses JS (slower, works everywhere)
 *
 * Usage:
 *   import { cryptoProvider } from '@/lib/crypto-provider'
 *   const kp = cryptoProvider.generateKeyPair()
 */

import { LlamenosCoreModule } from '../../modules/llamenos-core'
import type {
  NativeKeyPair,
  NativeKeyEnvelope,
  NativeRecipientKeyEnvelope,
  NativeEncryptedNote,
  NativeEncryptedMessage,
  NativeEncryptedKeyData,
  NativeAuthToken,
} from '../../modules/llamenos-core/src/LlamenosCoreModule'
import * as jsCrypto from './crypto'
import type { KeyEnvelope, RecipientKeyEnvelope, NotePayload, EncryptedKeyData, AuthToken } from './types'

/** Whether native Rust crypto is available */
export const isNativeCryptoAvailable = LlamenosCoreModule !== null

/** Crypto provider interface matching mobile app usage patterns */
export interface CryptoProvider {
  readonly isNative: boolean

  // --- Key Management ---
  generateKeyPair(): { secretKeyHex: string; publicKey: string; nsec: string; npub: string }
  keyPairFromNsec(nsec: string): { secretKeyHex: string; publicKey: string; nsec: string; npub: string } | null
  isValidNsec(nsec: string): boolean
  getPublicKey(secretKeyHex: string): string

  // --- Note Encryption ---
  encryptNote(
    payload: NotePayload,
    authorPubkey: string,
    adminPubkeys: string[],
  ): { encryptedContent: string; authorEnvelope: KeyEnvelope; adminEnvelopes: RecipientKeyEnvelope[] }
  decryptNote(encryptedContent: string, envelope: KeyEnvelope, secretKeyHex: string): NotePayload | null

  // --- Message Encryption ---
  encryptMessage(plaintext: string, readerPubkeys: string[]): {
    encryptedContent: string
    readerEnvelopes: RecipientKeyEnvelope[]
  }
  decryptMessage(
    encryptedContent: string,
    readerEnvelopes: RecipientKeyEnvelope[],
    secretKeyHex: string,
    readerPubkey: string,
  ): string | null

  // --- Call Record Decryption ---
  decryptCallRecord(
    encryptedContent: string,
    adminEnvelopes: RecipientKeyEnvelope[],
    secretKeyHex: string,
    readerPubkey: string,
  ): { answeredBy: string | null; callerNumber: string } | null

  // --- Draft Encryption ---
  encryptDraft(plaintext: string, secretKeyHex: string): string
  decryptDraft(packedHex: string, secretKeyHex: string): string | null

  // --- Auth Token ---
  createAuthToken(secretKeyHex: string, timestamp: number, method: string, path: string): string
}

// ---- Native provider (Rust via UniFFI) ----

function createNativeProvider(): CryptoProvider {
  const mod = LlamenosCoreModule!

  return {
    isNative: true,

    generateKeyPair() {
      const kp = mod.generateKeypair()
      return { secretKeyHex: kp.secretKeyHex, publicKey: kp.publicKey, nsec: kp.nsec, npub: kp.npub }
    },

    keyPairFromNsec(nsec: string) {
      try {
        const kp = mod.keypairFromNsec(nsec)
        return { secretKeyHex: kp.secretKeyHex, publicKey: kp.publicKey, nsec: kp.nsec, npub: kp.npub }
      } catch {
        return null
      }
    },

    isValidNsec: (nsec: string) => mod.isValidNsec(nsec),

    getPublicKey: (secretKeyHex: string) => mod.getPublicKey(secretKeyHex),

    encryptNote(payload, authorPubkey, adminPubkeys) {
      const enc = mod.encryptNoteForRecipients(JSON.stringify(payload), authorPubkey, adminPubkeys)
      return {
        encryptedContent: enc.encryptedContent,
        authorEnvelope: enc.authorEnvelope,
        adminEnvelopes: enc.adminEnvelopes,
      }
    },

    decryptNote(encryptedContent, envelope, secretKeyHex) {
      try {
        const json = mod.decryptNote(encryptedContent, envelope, secretKeyHex)
        const parsed = JSON.parse(json)
        if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
          return parsed as NotePayload
        }
        return { text: json }
      } catch {
        return null
      }
    },

    encryptMessage(plaintext, readerPubkeys) {
      const enc = mod.encryptMessageForReaders(plaintext, readerPubkeys)
      return { encryptedContent: enc.encryptedContent, readerEnvelopes: enc.readerEnvelopes }
    },

    decryptMessage(encryptedContent, readerEnvelopes, secretKeyHex, readerPubkey) {
      try {
        return mod.decryptMessageForReader(encryptedContent, readerEnvelopes, secretKeyHex, readerPubkey)
      } catch {
        return null
      }
    },

    decryptCallRecord(encryptedContent, adminEnvelopes, secretKeyHex, readerPubkey) {
      try {
        const json = mod.decryptCallRecordForReader(encryptedContent, adminEnvelopes, secretKeyHex, readerPubkey)
        return JSON.parse(json)
      } catch {
        return null
      }
    },

    encryptDraft: (plaintext, secretKeyHex) => mod.encryptDraft(plaintext, secretKeyHex),

    decryptDraft(packedHex, secretKeyHex) {
      try {
        return mod.decryptDraft(packedHex, secretKeyHex)
      } catch {
        return null
      }
    },

    createAuthToken(secretKeyHex, timestamp, method, path) {
      const token = mod.createAuthToken(secretKeyHex, timestamp, method, path)
      return JSON.stringify(token)
    },
  }
}

// ---- JS fallback provider (@noble/*) ----

function createJsProvider(): CryptoProvider {
  return {
    isNative: false,

    generateKeyPair() {
      const kp = jsCrypto.generateKeyPair()
      return {
        secretKeyHex: Array.from(kp.secretKey).map(b => b.toString(16).padStart(2, '0')).join(''),
        publicKey: kp.publicKey,
        nsec: kp.nsec,
        npub: kp.npub,
      }
    },

    keyPairFromNsec(nsec: string) {
      const kp = jsCrypto.keyPairFromNsec(nsec)
      if (!kp) return null
      return {
        secretKeyHex: Array.from(kp.secretKey).map(b => b.toString(16).padStart(2, '0')).join(''),
        publicKey: kp.publicKey,
        nsec: kp.nsec,
        npub: kp.npub,
      }
    },

    isValidNsec: jsCrypto.isValidNsec,

    getPublicKey(secretKeyHex: string) {
      const { getPublicKey } = require('nostr-tools')
      const bytes = new Uint8Array(secretKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      return getPublicKey(bytes)
    },

    encryptNote(payload, authorPubkey, adminPubkeys) {
      return jsCrypto.encryptNoteV2(payload, authorPubkey, adminPubkeys)
    },

    decryptNote(encryptedContent, envelope, secretKeyHex) {
      const sk = new Uint8Array(secretKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      return jsCrypto.decryptNoteV2(encryptedContent, envelope, sk)
    },

    encryptMessage: jsCrypto.encryptMessage,

    decryptMessage(encryptedContent, readerEnvelopes, secretKeyHex, readerPubkey) {
      const sk = new Uint8Array(secretKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      return jsCrypto.decryptMessage(encryptedContent, readerEnvelopes, sk, readerPubkey)
    },

    decryptCallRecord(encryptedContent, adminEnvelopes, secretKeyHex, readerPubkey) {
      const sk = new Uint8Array(secretKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      return jsCrypto.decryptCallRecord(encryptedContent, adminEnvelopes, sk, readerPubkey)
    },

    encryptDraft(plaintext, secretKeyHex) {
      const sk = new Uint8Array(secretKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      return jsCrypto.encryptDraft(plaintext, sk)
    },

    decryptDraft(packedHex, secretKeyHex) {
      const sk = new Uint8Array(secretKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      return jsCrypto.decryptDraft(packedHex, sk)
    },

    createAuthToken(secretKeyHex, timestamp, method, path) {
      const sk = new Uint8Array(secretKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
      return jsCrypto.createAuthToken(sk, timestamp, method, path)
    },
  }
}

/** The crypto provider — native Rust when available, JS fallback otherwise */
export const cryptoProvider: CryptoProvider = isNativeCryptoAvailable
  ? createNativeProvider()
  : createJsProvider()
