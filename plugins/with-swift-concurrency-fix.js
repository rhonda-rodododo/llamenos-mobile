/**
 * Expo config plugin to disable Swift 6 strict concurrency checking.
 *
 * Xcode 16.4+ (Swift 6.1) enables strict concurrency by default,
 * which breaks expo-modules-core and other pods that haven't adopted
 * Swift 6 strict concurrency annotations yet.
 *
 * This sets SWIFT_STRICT_CONCURRENCY=minimal for all pod targets.
 */
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const CONCURRENCY_SNIPPET = `
    # Disable Swift 6 strict concurrency for pod targets (Xcode 16.4+)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end`

function withSwiftConcurrencyFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      )

      if (!fs.existsSync(podfilePath)) return config

      let podfile = fs.readFileSync(podfilePath, 'utf-8')

      if (podfile.includes('SWIFT_STRICT_CONCURRENCY')) return config

      // Insert into existing post_install block
      const postInstallMatch = podfile.match(
        /^(\s*post_install\s+do\s*\|installer\|)/m
      )
      if (postInstallMatch) {
        podfile = podfile.replace(
          postInstallMatch[0],
          `${postInstallMatch[0]}${CONCURRENCY_SNIPPET}`
        )
      } else {
        // No post_install block — add one at the end
        podfile += `\npost_install do |installer|${CONCURRENCY_SNIPPET}\nend\n`
      }

      fs.writeFileSync(podfilePath, podfile)
      return config
    },
  ])
}

module.exports = withSwiftConcurrencyFix
