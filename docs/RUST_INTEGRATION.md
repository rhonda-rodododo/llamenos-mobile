# Rust Integration via UniFFI

This document describes how `llamenos-core` (the shared Rust cryptographic library) is integrated into the React Native mobile app via Mozilla's [UniFFI](https://mozilla.github.io/uniffi-rs/).

## Overview

UniFFI generates language bindings from a Rust library, producing:
- **Swift bindings** for iOS (compiled as an XCFramework)
- **Kotlin bindings** for Android (compiled as a JNI shared library)

This means all cryptographic operations (ECIES, Schnorr, HKDF, PBKDF2) run as native compiled Rust code on each platform, with zero JavaScript crypto.

## Architecture

```
llamenos-core (Rust)
  |
  +-- uniffi-bindgen --> Swift bindings --> iOS XCFramework
  |                      (LlamenosCoreFFI.xcframework)
  |
  +-- uniffi-bindgen --> Kotlin bindings --> Android .so / .aar
                         (llamenos-core.aar)
```

The React Native bridge layer (`src/lib/core/`) exposes these native modules to JavaScript via Expo Modules or a TurboModule.

## Prerequisites

- Rust toolchain (`rustup`)
- iOS targets: `rustup target add aarch64-apple-ios x86_64-apple-ios aarch64-apple-ios-sim`
- Android targets: `rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android`
- Android NDK (for cross-compilation)
- `cargo-ndk` for Android: `cargo install cargo-ndk`
- `uniffi-bindgen-cli`: `cargo install uniffi-bindgen-cli`

## Building for iOS

```bash
cd ~/projects/llamenos-core

# Build for all iOS targets
cargo build --release --target aarch64-apple-ios --features uniffi-bindgen
cargo build --release --target aarch64-apple-ios-sim --features uniffi-bindgen

# Generate Swift bindings
uniffi-bindgen generate \
  --library target/aarch64-apple-ios/release/libllamenos_core.dylib \
  --language swift \
  --out-dir bindings/swift

# Create XCFramework
xcodebuild -create-xcframework \
  -library target/aarch64-apple-ios/release/libllamenos_core.a \
  -headers bindings/swift \
  -library target/aarch64-apple-ios-sim/release/libllamenos_core.a \
  -headers bindings/swift \
  -output LlamenosCoreFFI.xcframework
```

## Building for Android

```bash
cd ~/projects/llamenos-core

# Build for all Android targets
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 \
  build --release --features uniffi-bindgen

# Generate Kotlin bindings
uniffi-bindgen generate \
  --library target/aarch64-linux-android/release/libllamenos_core.so \
  --language kotlin \
  --out-dir bindings/kotlin
```

## React Native Bridge

The native bindings are exposed to React Native via an Expo Module (or TurboModule). The bridge module lives at `src/lib/core/` and provides a typed TypeScript API that maps 1:1 to the Rust functions.

### Example Usage (Post-Integration)

```typescript
import { LlamenosCore } from "@/lib/core";

// Generate a new keypair
const { publicKey, secretKey } = await LlamenosCore.generateKeypair();

// Sign an auth token
const signature = await LlamenosCore.schnorrSign(messageHash, secretKey);

// Encrypt a note
const ciphertext = await LlamenosCore.eciesEncrypt(
  plaintext,
  recipientPubkey,
  "llamenos:note:encrypt"
);
```

## Wire Format Compatibility

The Rust implementation produces byte-identical output to the desktop app's TypeScript crypto (`@noble/curves`, `@noble/ciphers`). This is verified by cross-platform test vectors defined in the protocol spec at `../llamenos/docs/protocol/PROTOCOL.md`.

Key compatibility points:
- ECIES ciphertext format: `[33-byte ephemeral pubkey] [24-byte nonce] [ciphertext] [16-byte tag]`
- HKDF labels: All 25 domain separation constants match `crypto-labels.ts`
- Schnorr signatures: BIP-340 compliant, 64-byte output
- Nostr encoding: Standard NIP-19 bech32 (nsec/npub)

## CI/CD

The llamenos-core library is built in CI and the resulting artifacts (XCFramework, AAR) are published as GitHub Release assets. The mobile app's CI pulls the latest compatible release during the build step.
