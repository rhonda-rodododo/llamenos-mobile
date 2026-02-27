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
  s.vendored_frameworks = 'LlamenosCoreFFI.xcframework'

  # Preserve standalone FFI header and modulemap for compilation.
  # The framework modulemap handles linking, but the standalone modulemap
  # is needed for `import LlamenosCoreFFI` during Swift compilation.
  s.preserve_paths = 'LlamenosCoreFFI.h', 'LlamenosCoreFFI.modulemap'

  # Make LlamenosCoreFFI module importable during compilation.
  # CocoaPods sets up framework search paths for linking but not for
  # the pod's own Swift compilation. We use -fmodule-map-file to make
  # the standalone modulemap discoverable.
  #
  # EXCLUDED_ARCHS: The XCFramework only contains arm64 slices (device +
  # simulator). CocoaPods overrides ONLY_ACTIVE_ARCH to NO for pod targets,
  # causing x86_64 to be built even on Apple Silicon runners. Without this
  # exclusion, [CP] Copy XCFrameworks fails to find a matching slice and
  # the linker reports "framework not found".
  s.pod_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '-Xcc -fmodule-map-file=$(PODS_TARGET_SRCROOT)/LlamenosCoreFFI.modulemap',
    'HEADER_SEARCH_PATHS' => '$(PODS_TARGET_SRCROOT)',
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64',
  }
  s.user_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '$(inherited) -Xcc -fmodule-map-file=$(PODS_ROOT)/../../modules/llamenos-core/ios/LlamenosCoreFFI.modulemap',
    'HEADER_SEARCH_PATHS' => '$(inherited) $(PODS_ROOT)/../../modules/llamenos-core/ios',
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64',
    # Force-load the Rust static archive from the source XCFramework.
    # The XCFramework wraps a static .a inside .framework bundles. The linker
    # won't extract C/Rust FFI symbols via -framework alone. We reference the
    # SOURCE XCFramework path (not XCFrameworkIntermediates) so the file exists
    # at Xcode build-planning time, avoiding "Build input file cannot be found".
    # LLCP_XCFRAMEWORK_SLICE selects the correct platform slice via SDK condition.
    'LLCP_XCFRAMEWORK_SLICE' => 'ios-arm64',
    'LLCP_XCFRAMEWORK_SLICE[sdk=iphonesimulator*]' => 'ios-arm64-simulator',
    'OTHER_LDFLAGS' => '$(inherited) -force_load $(PODS_ROOT)/../../modules/llamenos-core/ios/LlamenosCoreFFI.xcframework/$(LLCP_XCFRAMEWORK_SLICE)/LlamenosCoreFFI.framework/LlamenosCoreFFI',
  }

  s.dependency 'ExpoModulesCore'

  s.swift_version    = '5.9'
  s.static_framework = true
end
