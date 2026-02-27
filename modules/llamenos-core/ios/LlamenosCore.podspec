Pod::Spec.new do |s|
  s.name           = 'LlamenosCore'
  s.version        = '0.1.0'
  s.summary        = 'Expo module wrapping llamenos-core Rust crypto via UniFFI'
  s.homepage       = 'https://github.com/rhonda-rodododo/llamenos-core'
  s.license        = { :type => 'AGPL-3.0-or-later' }
  s.author         = 'Llamenos Contributors'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/rhonda-rodododo/llamenos-core.git' }

  # Expo Module bridge + UniFFI-generated Swift bindings
  s.source_files   = '*.swift'

  # Vendored Rust static library as XCFramework.
  # The XCFramework contains .framework bundles (not raw .a files) to work
  # around CocoaPods issues #9528/#11372 with static library XCFrameworks.
  # The framework module LlamenosCoreFFI is auto-discoverable by the linker.
  s.vendored_frameworks = 'LlamenosCore.xcframework'

  # Preserve standalone FFI header and modulemap (for debugging / external use)
  s.preserve_paths = 'LlamenosCoreFFI.h', 'LlamenosCoreFFI.modulemap'

  s.dependency 'ExpoModulesCore'

  s.swift_version    = '5.9'
  s.static_framework = true
end
