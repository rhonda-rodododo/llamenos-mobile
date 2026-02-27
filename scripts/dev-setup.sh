#!/usr/bin/env bash
set -euo pipefail

# Developer setup script for llamenos-mobile (React Native/Expo).
# Checks prerequisites, installs deps, and verifies the build environment.
#
# Usage:
#   ./scripts/dev-setup.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}OK${NC}    $1"; }
warn() { echo -e "  ${YELLOW}WARN${NC}  $1"; }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; ERRORS=$((ERRORS + 1)); }

ERRORS=0

echo "Llamenos Mobile — Developer Setup"
echo "==================================="
echo ""

# --- Prerequisites ---
echo "Checking prerequisites:"

# Bun
if command -v bun &>/dev/null; then
  BUN_VER=$(bun --version 2>/dev/null)
  ok "Bun $BUN_VER"
else
  fail "Bun not found — install from https://bun.sh"
fi

# Node.js (needed by some Expo tools)
if command -v node &>/dev/null; then
  NODE_VER=$(node --version 2>/dev/null)
  ok "Node.js $NODE_VER"
else
  warn "Node.js not found — some Expo tools may require it"
fi

# Expo CLI
if bunx expo --version &>/dev/null 2>&1; then
  ok "Expo CLI"
else
  warn "Expo CLI not available — will be installed with bun install"
fi

# --- Platform SDKs ---
echo ""
echo "Checking platform SDKs:"

case "$(uname -s)" in
  Darwin)
    # Xcode
    if xcode-select -p &>/dev/null; then
      XCODE_VER=$(xcodebuild -version 2>/dev/null | head -1)
      ok "$XCODE_VER"
    else
      fail "Xcode not found — install from App Store"
    fi

    # CocoaPods
    if command -v pod &>/dev/null; then
      POD_VER=$(pod --version 2>/dev/null)
      ok "CocoaPods $POD_VER"
    else
      fail "CocoaPods not found — install: sudo gem install cocoapods"
    fi

    # iOS Simulator
    if xcrun simctl list devices available 2>/dev/null | grep -q "iPhone"; then
      ok "iOS Simulators available"
    else
      warn "No iOS simulators found — install via Xcode > Settings > Platforms"
    fi

    # applesimutils (for Detox)
    if command -v applesimutils &>/dev/null; then
      ok "applesimutils (Detox dep)"
    else
      warn "applesimutils not found — install for iOS E2E: brew tap wix/brew && brew install applesimutils"
    fi
    ;;
  Linux)
    warn "iOS builds not available on Linux"
    ;;
esac

# Android
if [[ -n "${ANDROID_HOME:-}" ]]; then
  ok "ANDROID_HOME=$ANDROID_HOME"

  # Android SDK
  if [[ -d "${ANDROID_HOME}/platforms" ]]; then
    APIS=$(ls "${ANDROID_HOME}/platforms/" 2>/dev/null | sort -V | tail -3 | tr '\n' ', ')
    ok "Android APIs: ${APIS%, }"
  else
    warn "No Android platform SDKs found"
  fi

  # Android NDK
  if [[ -d "${ANDROID_HOME}/ndk" ]]; then
    NDK_VER=$(ls "${ANDROID_HOME}/ndk/" 2>/dev/null | sort -V | tail -1)
    ok "Android NDK $NDK_VER"
  else
    warn "Android NDK not found — install via Android Studio SDK Manager"
  fi

  # Android emulator
  if command -v emulator &>/dev/null || [[ -f "${ANDROID_HOME}/emulator/emulator" ]]; then
    ok "Android emulator"
  else
    warn "Android emulator not found"
  fi
else
  warn "ANDROID_HOME not set — set it to your Android SDK path"
fi

# JDK (for Android builds)
if command -v java &>/dev/null; then
  JAVA_VER=$(java -version 2>&1 | head -1 | awk -F'"' '{print $2}')
  ok "Java $JAVA_VER"
  MAJOR=$(echo "$JAVA_VER" | cut -d. -f1)
  if [[ "$MAJOR" -lt 17 ]]; then
    warn "Java 17+ recommended for Android builds (found $JAVA_VER)"
  fi
else
  fail "Java not found — install JDK 17: https://adoptium.net"
fi

# --- Sibling repos ---
echo ""
echo "Checking sibling repos:"

CORE_PATH="$(cd "$(dirname "$0")/../.." && pwd)/llamenos-core"
if [[ -d "$CORE_PATH" ]]; then
  ok "llamenos-core at $CORE_PATH"
else
  warn "llamenos-core not found at $CORE_PATH — needed for native crypto builds"
fi

DESKTOP_PATH="$(cd "$(dirname "$0")/../.." && pwd)/llamenos"
if [[ -d "$DESKTOP_PATH" ]]; then
  ok "llamenos (desktop) at $DESKTOP_PATH"
else
  warn "llamenos desktop repo not found — needed for shared protocol reference"
fi

# --- Native libs ---
echo ""
echo "Checking native crypto libraries:"

NATIVE_ANDROID="$(dirname "$0")/../modules/llamenos-core/android/src/main/jniLibs/arm64-v8a/libllamenos_core.so"
NATIVE_IOS="$(dirname "$0")/../modules/llamenos-core/ios/LlamenosCore.xcframework"

if [[ -f "$NATIVE_ANDROID" ]]; then
  ok "Android native lib (arm64-v8a)"
else
  warn "Android native lib not found — run: ./scripts/build-native-libs.sh android"
fi

if [[ -d "$NATIVE_IOS" ]]; then
  ok "iOS XCFramework"
else
  warn "iOS XCFramework not found — run: ./scripts/build-native-libs.sh ios"
fi

# --- Install ---
echo ""
echo "Installing dependencies:"

cd "$(dirname "$0")/.."
bun install 2>&1 | tail -1
ok "bun install"

# --- Summary ---
echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}Setup complete!${NC} Key commands:"
  echo "  bun run start        # Start Expo dev server"
  echo "  bun run ios          # Run on iOS simulator"
  echo "  bun run android      # Run on Android emulator"
  echo "  bun run e2e:build:ios && bun run e2e:test:ios    # iOS E2E tests"
else
  echo -e "${RED}$ERRORS issue(s) found.${NC} Fix the above errors and re-run this script."
  exit 1
fi
