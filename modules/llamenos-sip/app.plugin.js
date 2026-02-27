/**
 * Expo config plugin for llamenos-sip.
 *
 * Adds the Linphone Maven repository to the root Android build.gradle
 * so Gradle can resolve org.linphone.no-video:linphone-sdk-android.
 */
const { withProjectBuildGradle } = require('expo/config-plugins')

const LINPHONE_MAVEN = `        maven {
            name = "linphone"
            url = uri("https://download.linphone.org/maven_repository")
            content {
                includeGroup("org.linphone")
                includeGroup("org.linphone.no-video")
            }
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

module.exports = withLinphoneMaven
