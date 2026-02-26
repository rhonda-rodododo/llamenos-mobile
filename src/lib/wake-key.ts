/**
 * Wake key for two-tier push notification decryption (Epic 86).
 *
 * The wake key is a secp256k1 keypair stored in SecureStore with
 * AFTER_FIRST_UNLOCK accessibility — decryptable without user's PIN.
 * This enables showing minimal notification content (type, IDs) on the
 * lock screen without requiring the volunteer to unlock the app.
 *
 * Full payload decryption still requires the volunteer's nsec (PIN unlock).
 */

import * as SecureStore from 'expo-secure-store'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { utf8ToBytes } from '@noble/ciphers/utils.js'
import { LABEL_PUSH_WAKE } from './crypto-labels'

const WAKE_KEY_STORE_KEY = 'llamenos:wake-key'

/**
 * Get or create the wake key, returning the compressed public key (hex).
 * The private key remains in SecureStore, accessible without user authentication.
 */
export async function getOrCreateWakeKey(): Promise<string> {
  let privHex = await SecureStore.getItemAsync(WAKE_KEY_STORE_KEY, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  })

  if (!privHex) {
    const privBytes = new Uint8Array(32)
    crypto.getRandomValues(privBytes)
    privHex = bytesToHex(privBytes)
    await SecureStore.setItemAsync(WAKE_KEY_STORE_KEY, privHex, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    })
  }

  return bytesToHex(secp256k1.getPublicKey(hexToBytes(privHex), true))
}

/** Get the wake public key without creating if it doesn't exist. */
export async function getWakeKeyPublic(): Promise<string | null> {
  const privHex = await SecureStore.getItemAsync(WAKE_KEY_STORE_KEY, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  })
  if (!privHex) return null
  return bytesToHex(secp256k1.getPublicKey(hexToBytes(privHex), true))
}

export interface WakePayload {
  type: 'message' | 'voicemail' | 'shift_reminder' | 'assignment'
  conversationId?: string
  channelType?: string
  callId?: string
  shiftId?: string
  startsAt?: string
}

/**
 * Decrypt a wake-tier ECIES push payload.
 * Does NOT require the user's PIN — wake key is accessible after first device unlock.
 *
 * The encrypted payload format is: ephemeralPubkey(33) + nonce(24) + ciphertext
 */
export async function decryptWakePayload(encryptedHex: string): Promise<WakePayload> {
  const privHex = await SecureStore.getItemAsync(WAKE_KEY_STORE_KEY, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  })
  if (!privHex) throw new Error('No wake key')

  const data = hexToBytes(encryptedHex)
  const ephemeralPub = data.slice(0, 33)
  const nonce = data.slice(33, 57)
  const ciphertext = data.slice(57)

  // ECDH with ephemeral pubkey
  const shared = secp256k1.getSharedSecret(hexToBytes(privHex), ephemeralPub)
  const sharedX = shared.slice(1, 33)

  // Domain-separated key derivation: SHA256(label || sharedX)
  const labelBytes = utf8ToBytes(LABEL_PUSH_WAKE)
  const keyInput = new Uint8Array(labelBytes.length + sharedX.length)
  keyInput.set(labelBytes)
  keyInput.set(sharedX, labelBytes.length)
  const symmetricKey = sha256(keyInput)

  const cipher = xchacha20poly1305(symmetricKey, nonce)
  const plaintext = cipher.decrypt(ciphertext)

  return JSON.parse(new TextDecoder().decode(plaintext)) as WakePayload
}
