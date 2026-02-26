# CLAUDE.md

This file provides guidance to Claude Code when working with the Llamenos mobile app.

## Project Overview

This is the **Llamenos mobile app** — a React Native / Expo client for the Llamenos crisis response hotline system. It is a companion to the desktop web app at `../llamenos/` (Vite + TanStack Router SPA).

**Status: Pre-production scaffold.** Core crypto integration via Rust (UniFFI) is not yet wired up.

## Tech Stack

- **Framework**: React Native via Expo (managed workflow, SDK 55)
- **Navigation**: Expo Router (file-based routing in `app/` directory)
- **Language**: TypeScript (strict mode)
- **Crypto**: `llamenos-core` (Rust) via UniFFI bindings — all crypto operations happen in Rust
- **Auth**: Nostr keypairs (BIP-340 Schnorr signatures), same protocol as desktop

## Architecture

### Crypto Layer — llamenos-core (Rust)

All cryptographic operations are performed by the `llamenos-core` Rust crate located at `~/projects/llamenos-core`. This ensures:

- **Single implementation**: One Rust crate covers iOS (Swift/UniFFI), Android (Kotlin/UniFFI), and web (WASM). No reimplementing crypto in JavaScript.
- **Same protocol**: Identical ECIES scheme (secp256k1 + XChaCha20-Poly1305), same domain separation labels (`crypto-labels`), same wire formats as the desktop app.
- **Memory safety**: Key material is zeroized on drop via the `zeroize` crate.

The protocol specification is the canonical reference:
`../llamenos/docs/protocol/PROTOCOL.md`

### Crypto Labels

All 25 domain separation constants are defined in `llamenos-core` and match exactly with the desktop app's `src/shared/crypto-labels.ts`. Never use raw string literals for crypto contexts.

### Key Operations Provided by llamenos-core

| Operation | Description |
|-----------|-------------|
| `ecies_encrypt` | ECIES envelope encryption (secp256k1 ECDH + HKDF + XChaCha20-Poly1305) |
| `ecies_decrypt` | ECIES envelope decryption |
| `schnorr_sign` | BIP-340 Schnorr signature for API auth tokens |
| `schnorr_verify` | BIP-340 signature verification |
| `hkdf_derive` | HKDF-SHA256 key derivation with domain separation |
| `pbkdf2_wrap` | PIN-based key wrapping (PBKDF2-HMAC-SHA256) |
| `pbkdf2_unwrap` | PIN-based key unwrapping |
| `generate_keypair` | Generate secp256k1 keypair |
| `nsec_encode/decode` | Nostr bech32 encoding/decoding |

## Directory Structure

```
app/                    # Expo Router file-based routes
  _layout.tsx           # Root layout (Stack navigator)
  index.tsx             # Home screen
src/
  lib/                  # Client utilities
    core/               # llamenos-core UniFFI bridge
      index.ts          # Re-exports from native module
    api-client.ts       # Authenticated HTTP client
    auth.ts             # Auth state management
  screens/              # Screen components (complex screens extracted from app/)
  navigation/           # Navigation helpers and types
  components/           # Shared UI components
assets/                 # App icons, splash screens
docs/
  RUST_INTEGRATION.md   # How to build and integrate llamenos-core
```

## Development Commands

```bash
bun install             # Install dependencies
bun run start           # Start Expo dev server
bun run ios             # Start on iOS simulator
bun run android         # Start on Android emulator
bun run typecheck       # Type check (tsc --noEmit)
```

## Security Requirements

Same as the desktop app (see `../llamenos/CLAUDE.md`):

- **E2EE / zero-knowledge**: Server cannot read call notes, transcripts, or PII
- **Volunteer identity protection**: Personal info visible only to admins
- **Nostr keypair auth**: BIP-340 Schnorr signatures on every API request
- **PIN-encrypted key store**: nsec never persists in plaintext
- **Forward secrecy**: Per-note random key, ECIES-wrapped per reader

## Gotchas

- `llamenos-core` must be built separately before the native module is available — see `docs/RUST_INTEGRATION.md`
- Nostr pubkeys are x-only (32 bytes) — prepend `"02"` for ECDH compressed format
- `secp256k1.getSharedSecret()` returns 33 bytes; extract x-coord with `.slice(1, 33)`
- App display name is "Hotline" (not "Llamenos") for volunteer security
- The `app/` directory is for Expo Router routes only — complex screen logic goes in `src/screens/`

## Working Style

- Always run `bun run typecheck` before committing
- Implement features completely — no stubs or TODOs left behind
- All crypto goes through `llamenos-core` — never implement crypto in TypeScript/JavaScript
- Keep the desktop protocol spec as the canonical reference for all wire formats
