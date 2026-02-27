# Mobile Build Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bun | latest | [bun.sh](https://bun.sh) |
| JDK | 17+ | [Adoptium](https://adoptium.net) |
| Android SDK | API 34 | Android Studio SDK Manager |
| Android NDK | r27c | Android Studio SDK Manager |
| Xcode | 15+ | App Store (macOS only) |
| CocoaPods | latest | `sudo gem install cocoapods` |

### Sibling Repos

```
parent/
  llamenos/           # Desktop + API repo
  llamenos-core/      # Rust crypto crate
  llamenos-mobile/    # This repo
```

## Setup

```bash
cd llamenos-mobile
bun install

# Or use the setup script
./scripts/dev-setup.sh
```

### Native Crypto Libraries

The app uses Rust crypto via llamenos-core. Two options:

**Option A: Download pre-built (recommended)**
```bash
./scripts/download-core-libs.sh
```

**Option B: Build from source**
```bash
./scripts/build-native-libs.sh
```

This requires Rust with mobile targets installed:
```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim \
  aarch64-linux-android armv7-linux-androideabi \
  i686-linux-android x86_64-linux-android
cargo install cargo-ndk
```

## Development

```bash
bun run start           # Start Expo dev server
bun run ios             # Run on iOS simulator
bun run android         # Run on Android emulator
```

## Building APK (Android)

```bash
# Prebuild native project
bunx expo prebuild --platform android --clean

# Build release APK
cd android && ./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Building iOS Simulator App

```bash
bunx expo prebuild --platform ios --clean
cd ios && pod install

xcodebuild \
  -workspace llamenos-mobile.xcworkspace \
  -scheme llamenos-mobile \
  -configuration Release \
  -sdk iphonesimulator \
  -derivedDataPath build \
  CODE_SIGNING_ALLOWED=NO
```

No Apple Developer account needed for simulator builds.

## Running E2E Tests (Detox)

### iOS

```bash
# Install applesimutils (first time)
brew tap wix/brew && brew install applesimutils

bun run e2e:build:ios
bun run e2e:test:ios
```

### Android

```bash
bun run e2e:build:android
bun run e2e:test:android
```

## CI/CD

- **E2E tests**: `.github/workflows/mobile-e2e.yml` — runs on PRs
- **Builds**: `.github/workflows/mobile-build.yml` — runs on tags, produces APK + iOS sim .app

## Troubleshooting

### Pod install fails

```bash
cd ios && pod deintegrate && pod install
```

### Native module not found

Ensure native libs are downloaded/built:
```bash
./scripts/download-core-libs.sh
```

### Android build fails with NDK error

Set `ANDROID_NDK_HOME`:
```bash
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/27.2.12479018
```
