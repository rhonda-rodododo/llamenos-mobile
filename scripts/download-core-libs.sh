#!/usr/bin/env bash
set -euo pipefail

# Download pre-built llamenos-core native libraries from GitHub Releases.
# Falls back to local sibling repo if available, then to building from source.
#
# Usage:
#   ./scripts/download-core-libs.sh                    # Download latest for all platforms
#   ./scripts/download-core-libs.sh android             # Android only
#   ./scripts/download-core-libs.sh ios                 # iOS only
#   CORE_RELEASE_TAG=v0.2.0 ./scripts/download-core-libs.sh  # Pin version
#
# Environment:
#   CORE_RELEASE_TAG  — Pin to a specific release tag (default: latest)
#   GITHUB_TOKEN      — Auth token for private repos / higher rate limits
#   GH_TOKEN          — Alternative auth token (GitHub CLI convention)

CORE_REPO="rhonda-rodododo/llamenos-core"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
MODULE_DIR="${MOBILE_DIR}/modules/llamenos-core"
CORE_DIR="${MOBILE_DIR}/../llamenos-core"

RELEASE_TAG="${CORE_RELEASE_TAG:-latest}"
PLATFORM="${1:-all}"
FORCE="${2:-}"

VERSION_FILE="${MODULE_DIR}/.core-version"

# Auth header for GitHub API (optional, helps with rate limits)
AUTH_HEADER=""
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [[ -n "$TOKEN" ]]; then
  AUTH_HEADER="Authorization: token ${TOKEN}"
fi

# ---- Resolve release tag ----
resolve_release_tag() {
  local api_url
  if [[ "$RELEASE_TAG" == "latest" ]]; then
    api_url="https://api.github.com/repos/${CORE_REPO}/releases/latest"
  else
    api_url="https://api.github.com/repos/${CORE_REPO}/releases/tags/${RELEASE_TAG}"
  fi

  echo "Fetching release info from ${api_url}..."

  local release_json
  if [[ -n "$AUTH_HEADER" ]]; then
    release_json=$(curl -sL -H "$AUTH_HEADER" "$api_url") || true
  else
    release_json=$(curl -sL "$api_url") || true
  fi

  RESOLVED_TAG=$(echo "$release_json" | grep -o '"tag_name": "[^"]*"' | head -1 | cut -d'"' -f4)

  if [[ -z "$RESOLVED_TAG" ]]; then
    echo "Error: Could not resolve release tag."
    return 1
  fi

  echo "Resolved release: ${RESOLVED_TAG}"

  # Check if already at this version
  if [[ -f "$VERSION_FILE" ]] && [[ "$(cat "$VERSION_FILE")" == "$RESOLVED_TAG" ]]; then
    if [[ "$FORCE" != "--force" ]]; then
      echo "Already at ${RESOLVED_TAG}. Pass --force to re-download."
      exit 0
    fi
  fi
}

# ---- Download from GitHub Release ----
download_release_artifact() {
  local artifact_name="$1"
  local dest_dir="$2"

  # Release workflow: VERSION="${GITHUB_REF_NAME#v}", filenames use v${VERSION}
  local url="https://github.com/${CORE_REPO}/releases/download/${RESOLVED_TAG}/${artifact_name}"

  echo "  Downloading ${artifact_name}..."
  echo "  URL: ${url}"

  local tmp_file
  tmp_file="$(mktemp)"

  local curl_args=(-fsSL -o "$tmp_file")
  if [[ -n "$AUTH_HEADER" ]]; then
    curl_args+=(-H "$AUTH_HEADER")
  fi

  if curl "${curl_args[@]}" "$url"; then
    echo "  Extracting to ${dest_dir}..."
    mkdir -p "$dest_dir"
    tar xzf "$tmp_file" -C "$dest_dir"
    rm -f "$tmp_file"
    return 0
  else
    echo "  Download failed: ${url}"
    rm -f "$tmp_file"
    return 1
  fi
}

# ---- Local sibling repo fallback ----
copy_android_from_local() {
  local jni_src="${CORE_DIR}/target"
  if [[ -f "${jni_src}/aarch64-linux-android/release/libllamenos_core.so" ]]; then
    echo "  Copying local Android native libs from ${CORE_DIR}..."
    mkdir -p "${MODULE_DIR}/android/src/main/jniLibs"/{arm64-v8a,armeabi-v7a,x86_64,x86}
    cp "${jni_src}/aarch64-linux-android/release/libllamenos_core.so" \
      "${MODULE_DIR}/android/src/main/jniLibs/arm64-v8a/" 2>/dev/null || true
    cp "${jni_src}/armv7-linux-androideabi/release/libllamenos_core.so" \
      "${MODULE_DIR}/android/src/main/jniLibs/armeabi-v7a/" 2>/dev/null || true
    cp "${jni_src}/x86_64-linux-android/release/libllamenos_core.so" \
      "${MODULE_DIR}/android/src/main/jniLibs/x86_64/" 2>/dev/null || true
    cp "${jni_src}/i686-linux-android/release/libllamenos_core.so" \
      "${MODULE_DIR}/android/src/main/jniLibs/x86/" 2>/dev/null || true

    # Kotlin bindings
    if [[ -d "${CORE_DIR}/bindings/kotlin" ]]; then
      mkdir -p "${MODULE_DIR}/android/src/main/java/org/llamenos/core"
      cp "${CORE_DIR}/bindings/kotlin/org/llamenos/core/llamenos_core.kt" \
        "${MODULE_DIR}/android/src/main/java/org/llamenos/core/" 2>/dev/null || true
    fi
    return 0
  fi
  return 1
}

copy_ios_from_local() {
  if [[ -d "${CORE_DIR}/dist/ios/LlamenosCoreFFI.xcframework" ]]; then
    echo "  Copying local iOS libs from ${CORE_DIR}/dist/ios/..."
    cp -R "${CORE_DIR}/dist/ios/LlamenosCoreFFI.xcframework" "${MODULE_DIR}/ios/"
    cp "${CORE_DIR}/dist/ios/LlamenosCore.swift" "${MODULE_DIR}/ios/" 2>/dev/null || true
    cp "${CORE_DIR}/dist/ios/LlamenosCoreFFI.h" "${MODULE_DIR}/ios/" 2>/dev/null || true
    cp "${CORE_DIR}/dist/ios/LlamenosCoreFFI.modulemap" "${MODULE_DIR}/ios/" 2>/dev/null || true
    return 0
  fi
  # Also check bindings/swift for generated files
  if [[ -d "${CORE_DIR}/bindings/swift" ]] && [[ -d "${MODULE_DIR}/ios/LlamenosCoreFFI.xcframework" ]]; then
    echo "  iOS XCFramework already present; copying Swift bindings..."
    cp "${CORE_DIR}/bindings/swift/LlamenosCore.swift" "${MODULE_DIR}/ios/" 2>/dev/null || true
    cp "${CORE_DIR}/bindings/swift/LlamenosCoreFFI.h" "${MODULE_DIR}/ios/" 2>/dev/null || true
    cp "${CORE_DIR}/bindings/swift/LlamenosCoreFFI.modulemap" "${MODULE_DIR}/ios/" 2>/dev/null || true
    return 0
  fi
  return 1
}

# ---- Platform handlers ----
do_android() {
  echo "=== Android native libraries ==="

  # Strip 'v' prefix: tag v0.1.0 -> version 0.1.0 -> filename llamenos-core-android-v0.1.0.tar.gz
  local stripped="${RESOLVED_TAG#v}"
  local artifact="llamenos-core-android-v${stripped}.tar.gz"

  # The android tarball contains jniLibs/ and kotlin/ at root
  if download_release_artifact "$artifact" "${MODULE_DIR}/android/src/main"; then
    # Move kotlin bindings to java source tree if present
    if [[ -d "${MODULE_DIR}/android/src/main/kotlin" ]]; then
      mkdir -p "${MODULE_DIR}/android/src/main/java"
      cp -R "${MODULE_DIR}/android/src/main/kotlin/"* "${MODULE_DIR}/android/src/main/java/" 2>/dev/null || true
      rm -rf "${MODULE_DIR}/android/src/main/kotlin"
    fi
    echo "  Android libs installed."
  elif copy_android_from_local; then
    echo "  Android libs copied from local build."
  else
    echo "  WARNING: Could not obtain Android native libs."
    echo "  Run ./scripts/build-native-libs.sh android to build from source."
    return 1
  fi
}

do_ios() {
  echo "=== iOS native libraries ==="

  local stripped="${RESOLVED_TAG#v}"
  local artifact="llamenos-core-ios-v${stripped}.tar.gz"

  # The iOS tarball contains LlamenosCore.swift, LlamenosCoreFFI.h,
  # LlamenosCoreFFI.modulemap, and LlamenosCoreFFI.xcframework/ at root
  if download_release_artifact "$artifact" "${MODULE_DIR}/ios"; then
    echo "  iOS libs installed."
  elif copy_ios_from_local; then
    echo "  iOS libs copied from local build."
  else
    echo "  WARNING: Could not obtain iOS native libs."
    echo "  Run ./scripts/build-native-libs.sh ios to build from source."
    return 1
  fi
}

# ---- Main ----
if ! resolve_release_tag; then
  echo ""
  echo "Could not fetch release info. Trying local sibling repo..."
  RESOLVED_TAG="local"

  case "$PLATFORM" in
    ios)     copy_ios_from_local || { echo "No local iOS libs found."; exit 1; } ;;
    android) copy_android_from_local || { echo "No local Android libs found."; exit 1; } ;;
    all)
      copy_android_from_local || echo "  No local Android libs."
      copy_ios_from_local || echo "  No local iOS libs."
      ;;
    *)       echo "Usage: $0 [ios|android|all]"; exit 1 ;;
  esac

  echo "$RESOLVED_TAG" > "$VERSION_FILE"
  echo "Done (from local)."
  exit 0
fi

case "$PLATFORM" in
  ios)     do_ios ;;
  android) do_android ;;
  all)     do_android; do_ios ;;
  *)       echo "Usage: $0 [ios|android|all]"; exit 1 ;;
esac

# Record version
echo "$RESOLVED_TAG" > "$VERSION_FILE"
echo ""
echo "Done! Native libs at ${RESOLVED_TAG}"
