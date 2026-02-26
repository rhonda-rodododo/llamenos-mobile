import ExpoModulesCore
import linphonesw
import CallKit
import PushKit
import AVFoundation

/// Expo Module wrapping Linphone SDK for native VoIP calling.
///
/// Provides SIP registration, call management, CallKit integration,
/// and VoIP push notification handling for iOS.
public class LlamenosSipModule: Module {
  private var core: Core?
  private var account: Account?
  private var coreDelegate: CoreDelegateStub?
  private var iterateTimer: Timer?
  private var callKitProvider: CXProvider?
  private var callKitController: CXCallController?
  private var voipRegistry: PKPushRegistry?
  private var voipToken: String?

  /// Maps Linphone call IDs to CallKit UUIDs
  private var callUuids: [String: UUID] = [:]

  public func definition() -> ModuleDefinition {
    Name("LlamenosSip")

    Events(
      "onRegistrationState",
      "onCallState",
      "onCallReceived",
      "onAudioDeviceChanged",
      "onEncryptionChanged"
    )

    // --- Lifecycle ---

    AsyncFunction("initialize") { () -> Void in
      try self.initializeCore()
    }

    AsyncFunction("destroy") { () -> Void in
      self.shutdownCore()
    }

    // --- SIP Registration ---

    AsyncFunction("register") { (config: [String: Any]) -> Void in
      try self.registerSip(config: config)
    }

    AsyncFunction("unregister") { () -> Void in
      self.unregisterSip()
    }

    AsyncFunction("getRegistrationState") { () -> String in
      guard let account = self.account else { return "none" }
      return self.registrationStateToString(account.state)
    }

    // --- Call Management ---

    AsyncFunction("answerCall") { (callId: String) -> Void in
      guard let call = self.findCall(callId) else {
        throw NSError(domain: "LlamenosSip", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "Call not found: \(callId)"
        ])
      }
      // Answer via CallKit action (handles audio session activation)
      if let uuid = self.callUuids[callId] {
        let action = CXAnswerCallAction(call: uuid)
        let transaction = CXTransaction(action: action)
        self.callKitController?.request(transaction, completion: { _ in })
      } else {
        try call.accept()
      }
    }

    AsyncFunction("declineCall") { (callId: String, reason: String?) -> Void in
      guard let call = self.findCall(callId) else {
        throw NSError(domain: "LlamenosSip", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "Call not found: \(callId)"
        ])
      }
      if let uuid = self.callUuids[callId] {
        let action = CXEndCallAction(call: uuid)
        let transaction = CXTransaction(action: action)
        self.callKitController?.request(transaction, completion: { _ in })
      } else {
        try call.decline(reason: .Declined)
      }
    }

    AsyncFunction("hangup") { (callId: String) -> Void in
      guard let call = self.findCall(callId) else {
        throw NSError(domain: "LlamenosSip", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "Call not found: \(callId)"
        ])
      }
      if let uuid = self.callUuids[callId] {
        let action = CXEndCallAction(call: uuid)
        let transaction = CXTransaction(action: action)
        self.callKitController?.request(transaction, completion: { _ in })
      } else {
        try call.terminate()
      }
    }

    AsyncFunction("setMuted") { (callId: String, muted: Bool) -> Void in
      guard let core = self.core else { return }
      core.micEnabled = !muted
    }

    AsyncFunction("setSpeaker") { (on: Bool) -> Void in
      guard let core = self.core else { return }
      for device in core.audioDevices {
        if on && device.type == .Speaker {
          core.outputAudioDevice = device
          break
        } else if !on && device.type == .Earpiece {
          core.outputAudioDevice = device
          break
        }
      }
    }

    AsyncFunction("sendDtmf") { (callId: String, digit: String) -> Void in
      guard let call = self.findCall(callId) else { return }
      if let char = digit.first {
        try call.sendDtmf(dtmf: char)
      }
    }

    AsyncFunction("holdCall") { (callId: String) -> Void in
      guard let call = self.findCall(callId) else { return }
      try call.pause()
    }

    AsyncFunction("resumeCall") { (callId: String) -> Void in
      guard let call = self.findCall(callId) else { return }
      try call.resume()
    }

    AsyncFunction("getActiveCall") { () -> [String: Any]? in
      guard let call = self.core?.currentCall else { return nil }
      return self.callInfoDict(call)
    }

    // --- Audio ---

    AsyncFunction("getAudioDevices") { () -> [[String: Any]] in
      guard let core = self.core else { return [] }
      return core.audioDevices.map { device in
        [
          "id": device.id,
          "name": device.deviceName,
          "type": self.audioDeviceTypeString(device.type),
        ]
      }
    }

    AsyncFunction("setAudioDevice") { (deviceId: String) -> Void in
      guard let core = self.core else { return }
      for device in core.audioDevices {
        if device.id == deviceId {
          core.outputAudioDevice = device
          break
        }
      }
    }

    // --- VoIP Push ---

    AsyncFunction("registerVoipPush") { () -> String in
      return try await withCheckedThrowingContinuation { continuation in
        if let token = self.voipToken {
          continuation.resume(returning: token)
          return
        }
        // Register PushKit and wait for token
        DispatchQueue.main.async {
          self.setupVoipPush { token in
            if let token = token {
              continuation.resume(returning: token)
            } else {
              continuation.resume(throwing: NSError(
                domain: "LlamenosSip",
                code: 3,
                userInfo: [NSLocalizedDescriptionKey: "Failed to get VoIP push token"]
              ))
            }
          }
        }
      }
    }

    OnDestroy {
      self.shutdownCore()
    }
  }

  // MARK: - Core Initialization

  private func initializeCore() throws {
    guard self.core == nil else { return } // Already initialized

    let factory = Factory.Instance

    let core = try factory.createCore(
      configPath: nil,
      factoryConfigPath: nil,
      systemContext: nil
    )

    // Audio codecs: prefer Opus, keep G.711 as fallback
    for codec in core.audioPayloadTypes {
      let mime = codec.mimeType.lowercased()
      codec.enable = (mime == "opus" || mime == "pcmu" || mime == "pcma")
    }

    // Disable video
    core.videoActivationPolicy?.automaticallyInitiate = false
    core.videoActivationPolicy?.automaticallyAccept = false

    // Default media encryption: SRTP mandatory
    core.mediaEncryption = .SRTP
    core.mediaEncryptionMandatory = true

    // Enable CallKit integration
    core.callkitEnabled = true

    // DNS SRV
    core.dnsSetResolve = true

    // Set up Core delegate
    let delegate = CoreDelegateStub(
      onCallStateChanged: { [weak self] (core, call, state, message) in
        self?.handleCallStateChanged(call: call, state: state, message: message)
      },
      onAccountRegistrationStateChanged: { [weak self] (core, account, state, message) in
        self?.handleRegistrationStateChanged(account: account, state: state, message: message)
      },
      onAudioDeviceChanged: { [weak self] (core, audioDevice) in
        self?.sendEvent("onAudioDeviceChanged", [
          "deviceId": audioDevice.id,
          "deviceName": audioDevice.deviceName,
        ])
      }
    )
    core.addDelegate(delegate: delegate)
    self.coreDelegate = delegate

    // Start core
    try core.start()
    self.core = core

    // Set up CallKit
    setupCallKit()

    // Start iterate timer (~20ms for Linphone event pump)
    self.iterateTimer = Timer.scheduledTimer(
      timeInterval: 0.02,
      target: self,
      selector: #selector(iterateCore),
      userInfo: nil,
      repeats: true
    )
    RunLoop.current.add(self.iterateTimer!, forMode: .common)
  }

  @objc private func iterateCore() {
    core?.iterate()
  }

  private func shutdownCore() {
    iterateTimer?.invalidate()
    iterateTimer = nil

    if let delegate = coreDelegate {
      core?.removeDelegate(delegate: delegate)
    }
    coreDelegate = nil

    core?.stop()
    core = nil
    account = nil
    callUuids.removeAll()
  }

  // MARK: - SIP Registration

  private func registerSip(config: [String: Any]) throws {
    guard let core = self.core else {
      throw NSError(domain: "LlamenosSip", code: 2, userInfo: [
        NSLocalizedDescriptionKey: "Core not initialized"
      ])
    }

    let domain = config["domain"] as! String
    let username = config["username"] as! String
    let password = config["password"] as! String
    let transport = config["transport"] as? String ?? "tls"
    let displayName = config["displayName"] as? String ?? "Llamenos Volunteer"
    let mediaEncryption = config["mediaEncryption"] as? String ?? "srtp"
    let preferredCodec = config["preferredCodec"] as? String ?? "opus"

    // Create auth info
    let authInfo = try Factory.Instance.createAuthInfo(
      username: username,
      userid: nil,
      passwd: password,
      ha1: nil,
      realm: nil,
      domain: domain
    )
    core.addAuthInfo(info: authInfo)

    // Create account params
    let params = try core.createAccountParams()

    // Identity
    let identity = try Factory.Instance.createAddress(addr: "sip:\(username)@\(domain)")
    try identity.setDisplayname(newValue: displayName)
    try params.setIdentityaddress(newValue: identity)

    // Server address with transport
    let transportType: TransportType
    switch transport.lowercased() {
    case "tls": transportType = .Tls
    case "tcp": transportType = .Tcp
    case "udp": transportType = .Udp
    default: transportType = .Tls
    }

    let serverAddr = try Factory.Instance.createAddress(addr: "sip:\(domain)")
    try serverAddr.setTransport(newValue: transportType)
    try params.setServeraddress(newValue: serverAddr)

    params.registerEnabled = true
    params.publishEnabled = false

    // Media encryption
    switch mediaEncryption.lowercased() {
    case "zrtp": core.mediaEncryption = .ZRTP
    case "srtp": core.mediaEncryption = .SRTP
    case "dtls-srtp": core.mediaEncryption = .DTLS
    default: core.mediaEncryption = .SRTP
    }
    core.mediaEncryptionMandatory = (mediaEncryption != "none")

    // Codec preference
    for codec in core.audioPayloadTypes {
      if codec.mimeType.lowercased() == preferredCodec.lowercased() {
        codec.enable = true
        // Move to top priority by setting normal bitrate
      }
    }

    // NAT/ICE configuration
    if let iceServers = config["iceServers"] as? [[String: Any]], !iceServers.isEmpty {
      let natPolicy = try core.createNatPolicy()
      natPolicy.stunEnabled = true
      natPolicy.iceEnabled = true
      natPolicy.turnEnabled = true

      if let first = iceServers.first, let url = first["url"] as? String {
        natPolicy.stunServer = url
        if let user = first["username"] as? String {
          natPolicy.stunServerUsername = user
        }
      }

      try natPolicy.resolve()
      params.natPolicy = natPolicy
    }

    // VoIP push notification config (if token available)
    if let token = self.voipToken {
      let pushConfig = params.pushNotificationConfig
      pushConfig?.provider = "apns.voip"
      pushConfig?.voipToken = token

      if let teamId = Bundle.main.infoDictionary?["APNS_TEAM_ID"] as? String,
         let bundleId = Bundle.main.bundleIdentifier {
        pushConfig?.param = "\(teamId).\(bundleId).voip"
      }
    }

    // Create and add account
    let acct = try core.createAccount(params: params)
    try core.addAccount(account: acct)
    core.defaultAccount = acct
    self.account = acct
  }

  private func unregisterSip() {
    guard let account = self.account, let core = self.core else { return }
    let params = account.params?.clone()
    params?.registerEnabled = false
    account.params = params
    core.removeAccount(account: account)
    core.clearAllAuthInfo()
    self.account = nil
  }

  // MARK: - Call State Handling

  private func handleCallStateChanged(call: Call, state: Call.State, message: String) {
    let callId = call.callLog?.callId ?? UUID().uuidString
    let stateStr = callStateToString(state)

    switch state {
    case .IncomingReceived, .PushIncomingReceived:
      let remoteAddr = call.remoteAddress?.asStringUriOnly() ?? "unknown"
      let remoteName = call.remoteAddress?.displayName ?? ""

      // Assign CallKit UUID
      let uuid = UUID()
      callUuids[callId] = uuid

      // Report to CallKit
      let update = CXCallUpdate()
      update.remoteHandle = CXHandle(type: .generic, value: remoteName.isEmpty ? remoteAddr : remoteName)
      update.localizedCallerName = remoteName.isEmpty ? "Incoming Call" : remoteName
      update.hasVideo = false

      callKitProvider?.reportNewIncomingCall(with: uuid, update: update) { error in
        if let error = error {
          print("[LlamenosSip] CallKit report error: \(error)")
        }
      }

      sendEvent("onCallReceived", [
        "callId": callId,
        "remoteAddress": remoteAddr,
        "displayName": remoteName,
      ])

    case .Connected, .StreamsRunning:
      // Update CallKit that call is connected
      if let uuid = callUuids[callId] {
        callKitProvider?.reportOutgoingCall(with: uuid, connectedAt: Date())
      }

    case .Released, .End, .Error:
      // Clean up CallKit
      if let uuid = callUuids[callId] {
        callKitProvider?.reportCall(with: uuid, endedAt: Date(), reason: state == .Error ? .failed : .remoteEnded)
        callUuids.removeValue(forKey: callId)
      }

    default:
      break
    }

    sendEvent("onCallState", [
      "callId": callId,
      "state": stateStr,
      "info": callInfoDict(call),
    ])

    // Check encryption state change
    if state == .StreamsRunning {
      let encryption = call.currentParams?.mediaEncryption ?? .None
      sendEvent("onEncryptionChanged", [
        "callId": callId,
        "encryption": mediaEncryptionToString(encryption),
        "zrtpSas": call.authenticationToken as Any,
      ])
    }
  }

  private func handleRegistrationStateChanged(account: Account, state: RegistrationState, message: String) {
    sendEvent("onRegistrationState", [
      "state": registrationStateToString(state),
      "reason": message,
    ])
  }

  // MARK: - CallKit Setup

  private func setupCallKit() {
    let config = CXProviderConfiguration()
    config.supportsVideo = false
    config.maximumCallsPerGroup = 1
    config.maximumCallGroups = 1
    config.supportedHandleTypes = [.generic]
    config.iconTemplateImageData = nil // Could set app icon

    let provider = CXProvider(configuration: config)
    provider.setDelegate(CallKitDelegate(module: self), queue: nil)
    self.callKitProvider = provider
    self.callKitController = CXCallController()
  }

  // MARK: - VoIP Push

  private var voipTokenCallback: ((String?) -> Void)?

  private func setupVoipPush(completion: @escaping (String?) -> Void) {
    self.voipTokenCallback = completion
    let registry = PKPushRegistry(queue: DispatchQueue.main)
    registry.delegate = VoipPushDelegate(module: self)
    registry.desiredPushTypes = [.voIP]
    self.voipRegistry = registry
  }

  fileprivate func handleVoipToken(_ token: String) {
    self.voipToken = token
    voipTokenCallback?(token)
    voipTokenCallback = nil
  }

  fileprivate func handleVoipPush(payload: PKPushPayload, completion: @escaping () -> Void) {
    // iOS mandate: Must report CallKit within push handler or app is killed
    let callId = payload.dictionaryPayload["call-id"] as? String
    let caller = payload.dictionaryPayload["caller"] as? String ?? "Incoming Call"

    let uuid = UUID()
    if let cid = callId {
      callUuids[cid] = uuid
    }

    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: caller)
    update.localizedCallerName = caller
    update.hasVideo = false

    callKitProvider?.reportNewIncomingCall(with: uuid, update: update) { error in
      if let error = error {
        print("[LlamenosSip] VoIP push CallKit error: \(error)")
      }
      // Process with Linphone Core
      self.core?.processPushNotification(callId: callId)
      completion()
    }
  }

  // MARK: - Helpers

  private func findCall(_ callId: String) -> Call? {
    guard let core = self.core else { return nil }
    // Check current call first
    if let current = core.currentCall,
       current.callLog?.callId == callId {
      return current
    }
    // Search all calls
    for call in core.calls {
      if call.callLog?.callId == callId {
        return call
      }
    }
    return nil
  }

  private func callInfoDict(_ call: Call) -> [String: Any] {
    let callId = call.callLog?.callId ?? ""
    let isSpeaker = core?.outputAudioDevice?.type == .Speaker
    return [
      "callId": callId,
      "remoteAddress": call.remoteAddress?.asStringUriOnly() ?? "",
      "displayName": call.remoteAddress?.displayName ?? "",
      "duration": call.duration,
      "state": callStateToString(call.state),
      "isMuted": !(core?.micEnabled ?? true),
      "isSpeaker": isSpeaker,
      "mediaEncryption": mediaEncryptionToString(call.currentParams?.mediaEncryption ?? .None),
      "zrtpSas": call.authenticationToken as Any,
    ]
  }

  private func callStateToString(_ state: Call.State) -> String {
    switch state {
    case .Idle: return "idle"
    case .IncomingReceived, .PushIncomingReceived, .IncomingEarlyMedia: return "incoming"
    case .OutgoingInit, .OutgoingRinging, .OutgoingProgress, .OutgoingEarlyMedia: return "outgoing"
    case .Connected: return "connecting"
    case .StreamsRunning: return "connected"
    case .Pausing, .Paused, .PausedByRemote: return "paused"
    case .Resuming: return "resuming"
    case .Released, .End: return "ended"
    case .Error: return "error"
    default: return "idle"
    }
  }

  private func registrationStateToString(_ state: RegistrationState) -> String {
    switch state {
    case .None: return "none"
    case .Progress: return "registering"
    case .Ok: return "registered"
    case .Failed: return "failed"
    case .Cleared: return "cleared"
    default: return "none"
    }
  }

  private func mediaEncryptionToString(_ enc: MediaEncryption) -> String {
    switch enc {
    case .SRTP: return "srtp"
    case .ZRTP: return "zrtp"
    case .DTLS: return "dtls-srtp"
    case .None: return "none"
    default: return "none"
    }
  }

  private func audioDeviceTypeString(_ type: AudioDeviceType) -> String {
    switch type {
    case .Earpiece: return "earpiece"
    case .Speaker: return "speaker"
    case .Bluetooth, .BluetoothA2DP: return "bluetooth"
    case .Headphones, .Headset: return "headset"
    default: return "unknown"
    }
  }
}

// MARK: - CallKit Delegate

private class CallKitDelegate: NSObject, CXProviderDelegate {
  weak var module: LlamenosSipModule?

  init(module: LlamenosSipModule) {
    self.module = module
    super.init()
  }

  func providerDidReset(_ provider: CXProvider) {
    // End all ongoing calls
    module?.core?.terminateAllCalls()
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    if let call = module?.core?.currentCall {
      try? call.accept()
    }
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    if let call = module?.core?.currentCall {
      try? call.terminate()
    }
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    module?.core?.micEnabled = !action.isMuted
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXSetHeldCallAction) {
    if let call = module?.core?.currentCall {
      if action.isOnHold {
        try? call.pause()
      } else {
        try? call.resume()
      }
    }
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    module?.core?.activateAudioSession(actived: true)
  }

  func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    module?.core?.activateAudioSession(actived: false)
  }
}

// MARK: - VoIP Push Delegate

private class VoipPushDelegate: NSObject, PKPushRegistryDelegate {
  weak var module: LlamenosSipModule?

  init(module: LlamenosSipModule) {
    self.module = module
    super.init()
  }

  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    module?.handleVoipToken(token)
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    module?.handleVoipPush(payload: payload, completion: completion)
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    module?.handleVoipToken("")
  }
}
