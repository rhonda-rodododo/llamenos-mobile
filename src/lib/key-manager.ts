/**
 * Singleton Key Manager — holds the decrypted secret key in a closure variable.
 *
 * Port of web app's key-manager.ts adapted for React Native:
 * - AppState replaces visibilitychange for auto-lock
 * - expo-secure-store replaces localStorage
 * - PBKDF2 via @noble/hashes (no Web Crypto API)
 *
 * The secretKey is NEVER stored in any globally accessible object.
 * It lives only in this module's closure scope.
 */

import { getPublicKey, nip19 } from 'nostr-tools'
import { AppState, type AppStateStatus } from 'react-native'
import { decryptStoredKey, storeEncryptedKey, hasStoredKey, clearStoredKey } from './key-store'
import { createAuthToken as _createAuthToken } from './crypto'

// --- Private state (closure-scoped, never exported) ---
let secretKey: Uint8Array | null = null
let publicKey: string | null = null

// --- Auto-lock ---
let idleTimer: ReturnType<typeof setTimeout> | null = null
const lockCallbacks = new Set<() => void>()
const unlockCallbacks = new Set<() => void>()
const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer)
  if (secretKey) {
    idleTimer = setTimeout(() => lock(), IDLE_TIMEOUT_MS)
  }
}

// Lock on app background — with configurable grace period
let backgroundTimer: ReturnType<typeof setTimeout> | null = null
const BACKGROUND_LOCK_DELAY_MS = 30_000 // 30 seconds

function handleAppStateChange(state: AppStateStatus) {
  if ((state === 'background' || state === 'inactive') && secretKey) {
    backgroundTimer = setTimeout(() => lock(), BACKGROUND_LOCK_DELAY_MS)
  } else if (state === 'active' && backgroundTimer) {
    // User came back within grace period — cancel the lock
    clearTimeout(backgroundTimer)
    backgroundTimer = null
  }
}

// Register AppState listener
const appStateSubscription = AppState.addEventListener('change', handleAppStateChange)

// --- Public API ---

/**
 * Unlock the key store by decrypting the nsec with the user's PIN.
 * Returns the hex pubkey on success, null on wrong PIN.
 */
export async function unlock(pin: string): Promise<string | null> {
  const nsec = await decryptStoredKey(pin)
  if (!nsec) return null

  try {
    const decoded = nip19.decode(nsec)
    if (decoded.type !== 'nsec') return null
    secretKey = decoded.data
    publicKey = getPublicKey(secretKey)
    resetIdleTimer()
    unlockCallbacks.forEach(cb => cb())
    return publicKey
  } catch {
    return null
  }
}

/**
 * Lock the key manager — zeros out the secret key bytes.
 */
export function lock() {
  if (secretKey) {
    secretKey.fill(0)
  }
  secretKey = null
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  lockCallbacks.forEach(cb => cb())
}

/**
 * Import a key (onboarding / recovery): encrypt and store, then load into memory.
 */
export async function importKey(nsec: string, pin: string): Promise<string> {
  const decoded = nip19.decode(nsec)
  if (decoded.type !== 'nsec') throw new Error('Invalid nsec')
  const sk = decoded.data
  const pk = getPublicKey(sk)

  await storeEncryptedKey(nsec, pin, pk)
  secretKey = sk
  publicKey = pk
  resetIdleTimer()
  unlockCallbacks.forEach(cb => cb())
  return pk
}

/**
 * Get the secret key. Throws if locked.
 */
export function getSecretKey(): Uint8Array {
  if (!secretKey) throw new KeyLockedError()
  resetIdleTimer()
  return secretKey
}

/**
 * Check if the key manager is currently unlocked.
 */
export function isUnlocked(): boolean {
  return secretKey !== null
}

/**
 * Get the public key (hex). Available when unlocked.
 */
export function getPublicKeyHex(): string | null {
  return publicKey
}

export { hasStoredKey }

/**
 * Create a Schnorr auth token using the in-memory secret key.
 * Throws KeyLockedError if locked.
 */
export function createAuthToken(timestamp: number, method: string, path: string): string {
  if (!secretKey) throw new KeyLockedError()
  resetIdleTimer()
  return _createAuthToken(secretKey, timestamp, method, path)
}

/**
 * Register a callback for lock events.
 */
export function onLock(cb: () => void): () => void {
  lockCallbacks.add(cb)
  return () => lockCallbacks.delete(cb)
}

/**
 * Register a callback for unlock events.
 */
export function onUnlock(cb: () => void): () => void {
  unlockCallbacks.add(cb)
  return () => unlockCallbacks.delete(cb)
}

/**
 * Wipe the encrypted key from storage and lock.
 */
export async function wipeKey(): Promise<void> {
  lock()
  await clearStoredKey()
}

export class KeyLockedError extends Error {
  constructor() {
    super('Key is locked. Enter PIN to unlock.')
    this.name = 'KeyLockedError'
  }
}

/**
 * Get the nsec as bech32 string (for backup only).
 */
export function getNsec(): string | null {
  if (!secretKey) return null
  return nip19.nsecEncode(secretKey)
}

/**
 * Clean up AppState listener. Call on app shutdown if needed.
 */
export function destroy(): void {
  appStateSubscription.remove()
}
