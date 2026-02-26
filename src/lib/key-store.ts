/**
 * Encrypted key storage using PBKDF2 + XChaCha20-Poly1305.
 *
 * Port of web app's key-store.ts. Uses expo-secure-store for persistence
 * instead of localStorage. The PBKDF2 derivation uses @noble/hashes
 * instead of Web Crypto API (not available in Hermes).
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { utf8ToBytes } from '@noble/ciphers/utils.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import * as SecureStore from 'expo-secure-store'
import { HMAC_KEYID_PREFIX } from './crypto-labels'
import type { EncryptedKeyData } from './types'

const STORAGE_KEY = 'encrypted-nsec'
const PUBKEY_KEY = 'nostr-pubkey'
const PBKDF2_ITERATIONS = 600_000

/**
 * Derive a 32-byte Key Encryption Key from a PIN using PBKDF2-SHA256.
 * Uses @noble/hashes PBKDF2 (not Web Crypto, which isn't available in Hermes).
 */
function deriveKEK(pin: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, utf8ToBytes(pin), salt, { c: PBKDF2_ITERATIONS, dkLen: 32 })
}

/**
 * Encrypt an nsec string with a PIN and store in expo-secure-store.
 */
export async function storeEncryptedKey(nsec: string, pin: string, pubkey: string): Promise<void> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)

  const kek = deriveKEK(pin, salt)
  const nonce = new Uint8Array(24)
  crypto.getRandomValues(nonce)

  const cipher = xchacha20poly1305(kek, nonce)
  const plaintext = utf8ToBytes(nsec)
  const ciphertext = cipher.encrypt(plaintext)

  // Hash pubkey for identification — never store plaintext pubkey alongside encrypted key
  const hashInput = utf8ToBytes(`${HMAC_KEYID_PREFIX}${pubkey}`)
  const pubkeyHash = bytesToHex(sha256(hashInput)).slice(0, 16)

  const data: EncryptedKeyData = {
    salt: bytesToHex(salt),
    iterations: PBKDF2_ITERATIONS,
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    pubkey: pubkeyHash,
  }

  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })

  // Store the actual pubkey separately (not secret, needed for UI before unlock)
  await SecureStore.setItemAsync(PUBKEY_KEY, pubkey)
}

/**
 * Decrypt the stored key using a PIN. Returns the nsec string or null on failure.
 */
export async function decryptStoredKey(pin: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY)
  if (!raw) return null

  try {
    const data: EncryptedKeyData = JSON.parse(raw)
    const salt = hexToBytes(data.salt)
    const nonce = hexToBytes(data.nonce)
    const ciphertext = hexToBytes(data.ciphertext)

    const kek = deriveKEK(pin, salt)
    const cipher = xchacha20poly1305(kek, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    return new TextDecoder().decode(plaintext)
  } catch {
    return null // Wrong PIN or corrupted data
  }
}

/**
 * Re-encrypt the stored key with a new PIN.
 */
export async function reEncryptKey(nsec: string, newPin: string, pubkey: string): Promise<void> {
  await storeEncryptedKey(nsec, newPin, pubkey)
}

/**
 * Check if an encrypted key exists in secure store.
 */
export async function hasStoredKey(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY)
  return raw !== null
}

/**
 * Get the stored pubkey (for UI display before unlock).
 */
export async function getStoredPubkey(): Promise<string | null> {
  return SecureStore.getItemAsync(PUBKEY_KEY)
}

/**
 * Clear the encrypted key from secure store (wipe on too many failed attempts).
 */
export async function clearStoredKey(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY)
  await SecureStore.deleteItemAsync(PUBKEY_KEY)
}

/**
 * Validate PIN format: 4-6 digits.
 */
export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}
