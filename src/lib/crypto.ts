/**
 * Cryptographic operations for Llamenos mobile.
 *
 * Port of the web app's src/client/lib/crypto.ts.
 * Uses @noble/* libraries which work in React Native once
 * crypto.getRandomValues and TextDecoder are polyfilled (index.js).
 *
 * All domain separation constants imported from crypto-labels.ts.
 */

import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools'
import { secp256k1, schnorr } from '@noble/curves/secp256k1.js'
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { utf8ToBytes } from '@noble/ciphers/utils.js'
import type { NotePayload, KeyEnvelope, RecipientKeyEnvelope } from './types'
import {
  LABEL_NOTE_KEY,
  LABEL_MESSAGE,
  LABEL_CALL_META,
  LABEL_TRANSCRIPTION,
  HKDF_SALT,
  HKDF_CONTEXT_NOTES,
  HKDF_CONTEXT_DRAFTS,
  HKDF_CONTEXT_EXPORT,
  AUTH_PREFIX,
} from './crypto-labels'

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

// --- Key Management ---

export interface KeyPair {
  secretKey: Uint8Array  // 32-byte private key
  publicKey: string      // hex-encoded public key
  nsec: string           // bech32-encoded private key
  npub: string           // bech32-encoded public key
}

export function generateKeyPair(): KeyPair {
  const secretKey = generateSecretKey()
  const publicKey = getPublicKey(secretKey)
  return {
    secretKey,
    publicKey,
    nsec: nip19.nsecEncode(secretKey),
    npub: nip19.npubEncode(publicKey),
  }
}

export function keyPairFromNsec(nsec: string): KeyPair | null {
  try {
    const decoded = nip19.decode(nsec)
    if (decoded.type !== 'nsec') return null
    const secretKey = decoded.data
    const publicKey = getPublicKey(secretKey)
    return {
      secretKey,
      publicKey,
      nsec,
      npub: nip19.npubEncode(publicKey),
    }
  } catch {
    return null
  }
}

export function isValidNsec(nsec: string): boolean {
  try {
    const decoded = nip19.decode(nsec)
    return decoded.type === 'nsec'
  } catch {
    return false
  }
}

// --- Encryption ---

function deriveEncryptionKey(secretKey: Uint8Array, label: string): Uint8Array {
  const salt = utf8ToBytes(HKDF_SALT)
  return hkdf(sha256, secretKey, salt, utf8ToBytes(label), 32)
}

// --- Generic ECIES Key Wrapping ---

export function eciesWrapKey(
  key: Uint8Array,
  recipientPubkeyHex: string,
  label: string,
): KeyEnvelope {
  const ephemeralSecret = randomBytes(32)
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralSecret, true)

  const recipientCompressed = hexToBytes('02' + recipientPubkeyHex)
  const shared = secp256k1.getSharedSecret(ephemeralSecret, recipientCompressed)
  const sharedX = shared.slice(1, 33)

  const labelBytes = utf8ToBytes(label)
  const keyInput = new Uint8Array(labelBytes.length + sharedX.length)
  keyInput.set(labelBytes)
  keyInput.set(sharedX, labelBytes.length)
  const symmetricKey = sha256(keyInput)

  const nonce = randomBytes(24)
  const cipher = xchacha20poly1305(symmetricKey, nonce)
  const ciphertext = cipher.encrypt(key)

  const packed = new Uint8Array(nonce.length + ciphertext.length)
  packed.set(nonce)
  packed.set(ciphertext, nonce.length)

  return {
    wrappedKey: bytesToHex(packed),
    ephemeralPubkey: bytesToHex(ephemeralPublicKey),
  }
}

export function eciesUnwrapKey(
  envelope: KeyEnvelope,
  secretKey: Uint8Array,
  label: string,
): Uint8Array {
  const ephemeralPub = hexToBytes(envelope.ephemeralPubkey)
  const shared = secp256k1.getSharedSecret(secretKey, ephemeralPub)
  const sharedX = shared.slice(1, 33)

  const labelBytes = utf8ToBytes(label)
  const keyInput = new Uint8Array(labelBytes.length + sharedX.length)
  keyInput.set(labelBytes)
  keyInput.set(sharedX, labelBytes.length)
  const symmetricKey = sha256(keyInput)

  const data = hexToBytes(envelope.wrappedKey)
  const nonce = data.slice(0, 24)
  const ciphertext = data.slice(24)
  const cipher = xchacha20poly1305(symmetricKey, nonce)
  return cipher.decrypt(ciphertext)
}

// --- Per-Note Ephemeral Key Encryption (V2 — forward secrecy) ---

export interface EncryptedNoteV2 {
  encryptedContent: string
  authorEnvelope: KeyEnvelope
  adminEnvelopes: RecipientKeyEnvelope[]
}

export function encryptNoteV2(
  payload: NotePayload,
  authorPubkey: string,
  adminPubkeys: string[],
): EncryptedNoteV2 {
  const noteKey = randomBytes(32)
  const nonce = randomBytes(24)
  const jsonString = JSON.stringify(payload)
  const cipher = xchacha20poly1305(noteKey, nonce)
  const ciphertext = cipher.encrypt(utf8ToBytes(jsonString))

  const packed = new Uint8Array(nonce.length + ciphertext.length)
  packed.set(nonce)
  packed.set(ciphertext, nonce.length)

  return {
    encryptedContent: bytesToHex(packed),
    authorEnvelope: eciesWrapKey(noteKey, authorPubkey, LABEL_NOTE_KEY),
    adminEnvelopes: adminPubkeys.map(pk => ({
      pubkey: pk,
      ...eciesWrapKey(noteKey, pk, LABEL_NOTE_KEY),
    })),
  }
}

export function decryptNoteV2(
  encryptedContent: string,
  envelope: KeyEnvelope,
  secretKey: Uint8Array,
): NotePayload | null {
  try {
    const noteKey = eciesUnwrapKey(envelope, secretKey, LABEL_NOTE_KEY)
    const data = hexToBytes(encryptedContent)
    const nonce = data.slice(0, 24)
    const ciphertext = data.slice(24)
    const cipher = xchacha20poly1305(noteKey, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    const decoded = decodeUtf8(plaintext)
    try {
      const parsed = JSON.parse(decoded)
      if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
        return parsed as NotePayload
      }
    } catch {
      // Not JSON
    }
    return { text: decoded }
  } catch {
    return null
  }
}

// --- E2EE Message Encryption ---

export interface EncryptedMessagePayload {
  encryptedContent: string
  readerEnvelopes: RecipientKeyEnvelope[]
}

export function encryptMessage(
  plaintext: string,
  readerPubkeys: string[],
): EncryptedMessagePayload {
  const messageKey = randomBytes(32)
  const nonce = randomBytes(24)
  const cipher = xchacha20poly1305(messageKey, nonce)
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext))

  const packed = new Uint8Array(nonce.length + ciphertext.length)
  packed.set(nonce)
  packed.set(ciphertext, nonce.length)

  return {
    encryptedContent: bytesToHex(packed),
    readerEnvelopes: readerPubkeys.map(pk => ({
      pubkey: pk,
      ...eciesWrapKey(messageKey, pk, LABEL_MESSAGE),
    })),
  }
}

export function decryptMessage(
  encryptedContent: string,
  readerEnvelopes: RecipientKeyEnvelope[],
  secretKey: Uint8Array,
  readerPubkey: string,
): string | null {
  try {
    const envelope = readerEnvelopes.find(e => e.pubkey === readerPubkey)
    if (!envelope) return null
    const messageKey = eciesUnwrapKey(envelope, secretKey, LABEL_MESSAGE)
    const data = hexToBytes(encryptedContent)
    const nonce = data.slice(0, 24)
    const ciphertext = data.slice(24)
    const cipher = xchacha20poly1305(messageKey, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    return decodeUtf8(plaintext)
  } catch {
    return null
  }
}

// --- Call Record Decryption ---

export function decryptCallRecord(
  encryptedContent: string,
  adminEnvelopes: RecipientKeyEnvelope[],
  secretKey: Uint8Array,
  readerPubkey: string,
): { answeredBy: string | null; callerNumber: string } | null {
  try {
    const envelope = adminEnvelopes.find(e => e.pubkey === readerPubkey)
    if (!envelope) return null
    const recordKey = eciesUnwrapKey(envelope, secretKey, LABEL_CALL_META)
    const data = hexToBytes(encryptedContent)
    const nonce = data.slice(0, 24)
    const ciphertext = data.slice(24)
    const cipher = xchacha20poly1305(recordKey, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    return JSON.parse(decodeUtf8(plaintext))
  } catch {
    return null
  }
}

// --- Legacy V1 Decryption (backward compat) ---

export function decryptNote(packed: string, secretKey: Uint8Array): NotePayload | null {
  try {
    const key = deriveEncryptionKey(secretKey, HKDF_CONTEXT_NOTES)
    const data = hexToBytes(packed)
    const nonce = data.slice(0, 24)
    const ciphertext = data.slice(24)
    const cipher = xchacha20poly1305(key, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    const decoded = decodeUtf8(plaintext)
    try {
      const parsed = JSON.parse(decoded)
      if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') {
        return parsed as NotePayload
      }
    } catch {
      // Not JSON — legacy plain text note
    }
    return { text: decoded }
  } catch {
    return null
  }
}

// --- Transcription Decryption ---

export function decryptTranscription(
  packed: string,
  ephemeralPubkeyHex: string,
  secretKey: Uint8Array,
): string | null {
  try {
    const ephemeralPub = hexToBytes(ephemeralPubkeyHex)
    const shared = secp256k1.getSharedSecret(secretKey, ephemeralPub)
    const sharedX = shared.slice(1, 33)
    const label = utf8ToBytes(LABEL_TRANSCRIPTION)
    const keyInput = new Uint8Array(label.length + sharedX.length)
    keyInput.set(label)
    keyInput.set(sharedX, label.length)
    const symmetricKey = sha256(keyInput)
    const data = hexToBytes(packed)
    const nonce = data.slice(0, 24)
    const ciphertext = data.slice(24)
    const cipher = xchacha20poly1305(symmetricKey, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    return decodeUtf8(plaintext)
  } catch {
    return null
  }
}

// --- Draft Encryption ---

export function encryptDraft(plaintext: string, secretKey: Uint8Array): string {
  const key = deriveEncryptionKey(secretKey, HKDF_CONTEXT_DRAFTS)
  const nonce = randomBytes(24)
  const data = utf8ToBytes(plaintext)
  const cipher = xchacha20poly1305(key, nonce)
  const ciphertext = cipher.encrypt(data)
  const packed = new Uint8Array(nonce.length + ciphertext.length)
  packed.set(nonce)
  packed.set(ciphertext, nonce.length)
  return bytesToHex(packed)
}

export function decryptDraft(packed: string, secretKey: Uint8Array): string | null {
  try {
    const key = deriveEncryptionKey(secretKey, HKDF_CONTEXT_DRAFTS)
    const data = hexToBytes(packed)
    const nonce = data.slice(0, 24)
    const ciphertext = data.slice(24)
    const cipher = xchacha20poly1305(key, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    return decodeUtf8(plaintext)
  } catch {
    return null
  }
}

// --- Export Encryption ---

export function encryptExport(jsonString: string, secretKey: Uint8Array): Uint8Array {
  const key = deriveEncryptionKey(secretKey, HKDF_CONTEXT_EXPORT)
  const nonce = randomBytes(24)
  const data = utf8ToBytes(jsonString)
  const cipher = xchacha20poly1305(key, nonce)
  const ciphertext = cipher.encrypt(data)
  const packed = new Uint8Array(nonce.length + ciphertext.length)
  packed.set(nonce)
  packed.set(ciphertext, nonce.length)
  return packed
}

// --- Auth Token ---

export function createAuthToken(secretKey: Uint8Array, timestamp: number, method: string, path: string): string {
  const publicKey = getPublicKey(secretKey)
  const message = `${AUTH_PREFIX}${publicKey}:${timestamp}:${method}:${path}`
  const messageHash = sha256(utf8ToBytes(message))
  const signature = schnorr.sign(messageHash, secretKey)
  const token = bytesToHex(signature)
  return JSON.stringify({ pubkey: publicKey, timestamp, token })
}
