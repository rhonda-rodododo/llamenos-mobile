/**
 * Expo config plugin to disable Swift 6 strict concurrency checking.
 *
 * Xcode 16.4+ (Swift 6.1) enables strict concurrency by default,
 * which breaks expo-modules-core and other pods that haven't adopted
 * Swift 6 strict concurrency annotations yet.
 *
 * This sets SWIFT_STRICT_CONCURRENCY=minimal and ensures Swift 5 language
 * mode for all pod targets AFTER react_native_post_install runs.
 */
const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const CONCURRENCY_SNIPPET = `
    # Disable Swift 6 strict concurrency for pod targets (Xcode 16.4+)
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
        bc.build_settings['SWIFT_VERSION'] ||= '5.0'
      end
    end
`

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

      // Insert snippet before the closing `end` of the post_install block.
      // The Podfile ends with:
      //     )
      //   end
      // end
      // We want to insert before the inner `end` (closing post_install).
      podfile = podfile.replace(
        /(\s+)\)\n(\s+end\nend\s*)$/,
        `$1)${CONCURRENCY_SNIPPET}$2`
      )

      fs.writeFileSync(podfilePath, podfile)
      return config
    },
  ])
}

module.exports = withSwiftConcurrencyFix
