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

  # Vendored Rust static library as XCFramework
  s.vendored_frameworks = 'LlamenosCore.xcframework'

  # Preserve the FFI header and modulemap for the Clang importer
  s.preserve_paths = 'LlamenosCoreFFI.h', 'LlamenosCoreFFI.modulemap'

  s.dependency 'ExpoModulesCore'

  s.swift_version    = '5.9'
  s.static_framework = true
end
