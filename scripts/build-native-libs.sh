#!/usr/bin/env bash
# Build llamenos-core native libraries for iOS and Android.
#
# Prerequisites:
#   rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
#   rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
#   cargo install cargo-ndk
#
# Usage:
#   ./scripts/build-native-libs.sh           # Build both platforms
#   ./scripts/build-native-libs.sh ios       # iOS only
#   ./scripts/build-native-libs.sh android   # Android only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
CORE_DIR="${MOBILE_DIR}/../llamenos-core"
MODULE_DIR="${MOBILE_DIR}/modules/llamenos-core"

if [[ ! -d "$CORE_DIR" ]]; then
  echo "ERROR: llamenos-core not found at $CORE_DIR"
  echo "Make sure llamenos-core is a sibling of llamenos-mobile."
  exit 1
fi

cd "$CORE_DIR"

PLATFORM="${1:-all}"

# ---- iOS ----
build_ios() {
  echo "=== Building for iOS ==="

  echo "  Building aarch64-apple-ios (device)..."
  cargo build --release --target aarch64-apple-ios --features uniffi-bindgen

  echo "  Building aarch64-apple-ios-sim (Apple Silicon simulator)..."
  cargo build --release --target aarch64-apple-ios-sim --features uniffi-bindgen

  echo "  Generating Swift bindings..."
  mkdir -p bindings/swift
  cargo run --features uniffi-bindgen --bin uniffi-bindgen -- \
    generate --library target/aarch64-apple-ios/release/libllamenos_core.a \
    --language swift --out-dir bindings/swift/ 2>/dev/null || \
  cargo run --features uniffi-bindgen --bin uniffi-bindgen -- \
    generate --library target/debug/libllamenos_core.dylib \
    --language swift --out-dir bindings/swift/

  echo "  Copying Swift bindings to module..."
  cp bindings/swift/LlamenosCore.swift "$MODULE_DIR/ios/"
  cp bindings/swift/LlamenosCoreFFI.h "$MODULE_DIR/ios/"
  cp bindings/swift/LlamenosCoreFFI.modulemap "$MODULE_DIR/ios/"

  echo "  Creating XCFramework..."
  rm -rf LlamenosCoreFFI.xcframework
  xcodebuild -create-xcframework \
    -library target/aarch64-apple-ios/release/libllamenos_core.a \
    -headers "$MODULE_DIR/ios" \
    -library target/aarch64-apple-ios-sim/release/libllamenos_core.a \
    -headers "$MODULE_DIR/ios" \
    -output "$MODULE_DIR/ios/LlamenosCoreFFI.xcframework"

  echo "  iOS build complete."
}

# ---- Android ----
build_android() {
  echo "=== Building for Android ==="

  echo "  Building Android targets via cargo-ndk..."
  cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 \
    build --release --features uniffi-bindgen

  echo "  Generating Kotlin bindings..."
  mkdir -p bindings/kotlin
  # Use the arm64 library for binding generation (all produce identical metadata)
  cargo run --features uniffi-bindgen --bin uniffi-bindgen -- \
    generate --library target/aarch64-linux-android/release/libllamenos_core.so \
    --language kotlin --out-dir bindings/kotlin/ 2>/dev/null || \
  cargo run --features uniffi-bindgen --bin uniffi-bindgen -- \
    generate --library target/debug/libllamenos_core.so \
    --language kotlin --out-dir bindings/kotlin/

  echo "  Copying Kotlin bindings to module..."
  mkdir -p "$MODULE_DIR/android/src/main/java/org/llamenos/core"
  cp bindings/kotlin/org/llamenos/core/llamenos_core.kt \
    "$MODULE_DIR/android/src/main/java/org/llamenos/core/"

  echo "  Copying native .so files to jniLibs..."
  mkdir -p "$MODULE_DIR/android/src/main/jniLibs"/{arm64-v8a,armeabi-v7a,x86_64,x86}
  cp target/aarch64-linux-android/release/libllamenos_core.so \
    "$MODULE_DIR/android/src/main/jniLibs/arm64-v8a/"
  cp target/armv7-linux-androideabi/release/libllamenos_core.so \
    "$MODULE_DIR/android/src/main/jniLibs/armeabi-v7a/"
  cp target/x86_64-linux-android/release/libllamenos_core.so \
    "$MODULE_DIR/android/src/main/jniLibs/x86_64/"
  cp target/i686-linux-android/release/libllamenos_core.so \
    "$MODULE_DIR/android/src/main/jniLibs/x86/"

  echo "  Android build complete."
}

case "$PLATFORM" in
  ios)     build_ios ;;
  android) build_android ;;
  all)     build_ios; build_android ;;
  *)       echo "Usage: $0 [ios|android|all]"; exit 1 ;;
esac

echo ""
echo "Native libraries built successfully."
echo "Module directory: $MODULE_DIR"
