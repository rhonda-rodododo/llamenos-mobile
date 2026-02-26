/**
 * Authentication module for Llamenos mobile.
 *
 * Manages Nostr keypair lifecycle:
 * - Key generation and import (nsec)
 * - PIN-encrypted local key storage
 * - Schnorr signature creation for API auth
 *
 * All cryptographic operations are delegated to llamenos-core (Rust)
 * via UniFFI bindings. This module provides the React Native integration
 * layer (secure storage, biometric unlock, etc).
 */

export interface AuthState {
  isAuthenticated: boolean;
  pubkey: string | null;
}

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  pubkey: null,
};
