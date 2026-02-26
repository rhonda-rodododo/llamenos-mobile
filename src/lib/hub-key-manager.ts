/**
 * Hub Key Manager — hub-wide symmetric encryption key management.
 * Port of web app's src/client/lib/hub-key-manager.ts.
 */

import { xchacha20poly1305 } from '@noble/ciphers/chacha.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { utf8ToBytes } from '@noble/ciphers/utils.js'
import { eciesWrapKey, eciesUnwrapKey } from './crypto'
import { LABEL_HUB_KEY_WRAP } from './crypto-labels'
import type { KeyEnvelope, RecipientKeyEnvelope } from './types'

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

export function generateHubKey(): Uint8Array {
  return randomBytes(32)
}

export function wrapHubKeyForMember(
  hubKey: Uint8Array,
  memberPubkeyHex: string,
): RecipientKeyEnvelope {
  return {
    pubkey: memberPubkeyHex,
    ...eciesWrapKey(hubKey, memberPubkeyHex, LABEL_HUB_KEY_WRAP),
  }
}

export function wrapHubKeyForMembers(
  hubKey: Uint8Array,
  memberPubkeys: string[],
): RecipientKeyEnvelope[] {
  return memberPubkeys.map(pk => wrapHubKeyForMember(hubKey, pk))
}

export function unwrapHubKey(
  envelope: KeyEnvelope,
  secretKey: Uint8Array,
): Uint8Array {
  return eciesUnwrapKey(envelope, secretKey, LABEL_HUB_KEY_WRAP)
}

export function encryptForHub(
  plaintext: string,
  hubKey: Uint8Array,
): string {
  const nonce = randomBytes(24)
  const cipher = xchacha20poly1305(hubKey, nonce)
  const ciphertext = cipher.encrypt(utf8ToBytes(plaintext))
  const packed = new Uint8Array(nonce.length + ciphertext.length)
  packed.set(nonce)
  packed.set(ciphertext, nonce.length)
  return bytesToHex(packed)
}

export function decryptFromHub(
  packed: string,
  hubKey: Uint8Array,
): string | null {
  try {
    const data = hexToBytes(packed)
    const nonce = data.slice(0, 24)
    const ciphertext = data.slice(24)
    const cipher = xchacha20poly1305(hubKey, nonce)
    const plaintext = cipher.decrypt(ciphertext)
    return new TextDecoder().decode(plaintext)
  } catch {
    return null
  }
}

export function rotateHubKey(
  memberPubkeys: string[],
): { hubKey: Uint8Array; envelopes: RecipientKeyEnvelope[] } {
  const hubKey = generateHubKey()
  const envelopes = wrapHubKeyForMembers(hubKey, memberPubkeys)
  return { hubKey, envelopes }
}
