/**
 * Expo config plugin for llamenos-sip.
 *
 * 1. Adds the Linphone Maven repository to the root Android build.gradle
 *    so Gradle can resolve org.linphone.no-video:linphone-sdk-android.
 * 2. Adds packagingOptions to the app build.gradle to resolve libc++_shared.so
 *    duplicate between React Native and Linphone SDK.
 */
const {
  withProjectBuildGradle,
  withAppBuildGradle,
} = require('expo/config-plugins')

const LINPHONE_MAVEN = `        maven {
            name = "linphone"
            url = uri("https://download.linphone.org/maven_repository")
            content {
                includeGroup("org.linphone")
                includeGroup("org.linphone.no-video")
            }
        }`

const PACKAGING_OPTIONS = `
    packagingOptions {
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/x86/libc++_shared.so'
    }`

function withLinphoneMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents
    // Only add if not already present
    if (contents.includes('download.linphone.org')) {
      return config
    }
    // Insert after the last repository in allprojects { repositories { ... } }
    config.modResults.contents = contents.replace(
      /(allprojects\s*\{[\s\S]*?repositories\s*\{[\s\S]*?)(maven\s*\{[^}]*jitpack[^}]*\})/,
      `$1$2\n${LINPHONE_MAVEN}`
    )
    return config
  })
}

function withPackagingOptions(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents
    // Only add if not already present
    if (contents.includes("pickFirst 'lib/")) {
      return config
    }
    // Insert packagingOptions inside the android { } block
    config.modResults.contents = contents.replace(
      /(android\s*\{)/,
      `$1${PACKAGING_OPTIONS}`
    )
    return config
  })
}

function withLlamenosSip(config) {
  config = withLinphoneMaven(config)
  config = withPackagingOptions(config)
  return config
}

module.exports = withLlamenosSip
