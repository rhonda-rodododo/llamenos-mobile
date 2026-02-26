package org.llamenos.sip

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import org.linphone.core.*

/**
 * Expo Module wrapping Linphone SDK for native VoIP calling.
 *
 * Provides SIP registration, call management, ConnectionService integration,
 * and FCM push notification handling for Android.
 */
class LlamenosSipModule : Module() {
  private var core: Core? = null
  private var account: Account? = null
  private var iterateRunnable: Runnable? = null

  /** Maps Linphone call IDs to unique identifiers for ConnectionService */
  private val callIds = mutableMapOf<String, String>()

  private val coreListener = object : CoreListenerStub() {
    override fun onCallStateChanged(
      core: Core, call: Call, state: Call.State, message: String
    ) {
      handleCallStateChanged(call, state, message)
    }

    override fun onAccountRegistrationStateChanged(
      core: Core, account: Account, state: RegistrationState, message: String
    ) {
      handleRegistrationStateChanged(account, state, message)
    }

    override fun onAudioDeviceChanged(core: Core, audioDevice: AudioDevice) {
      sendEvent("onAudioDeviceChanged", mapOf(
        "deviceId" to audioDevice.id,
        "deviceName" to audioDevice.deviceName,
      ))
    }
  }

  override fun definition() = ModuleDefinition {
    Name("LlamenosSip")

    Events(
      "onRegistrationState",
      "onCallState",
      "onCallReceived",
      "onAudioDeviceChanged",
      "onEncryptionChanged"
    )

    // --- Lifecycle ---

    AsyncFunction("initialize") {
      initializeCore()
    }

    AsyncFunction("destroy") {
      shutdownCore()
    }

    // --- SIP Registration ---

    AsyncFunction("register") { config: Map<String, Any> ->
      registerSip(config)
    }

    AsyncFunction("unregister") {
      unregisterSip()
    }

    AsyncFunction("getRegistrationState") {
      account?.let { registrationStateToString(it.state) } ?: "none"
    }

    // --- Call Management ---

    AsyncFunction("answerCall") { callId: String ->
      val call = findCall(callId)
        ?: throw Exception("Call not found: $callId")
      call.accept()
    }

    AsyncFunction("declineCall") { callId: String, _reason: String? ->
      val call = findCall(callId)
        ?: throw Exception("Call not found: $callId")
      call.decline(Reason.Declined)
    }

    AsyncFunction("hangup") { callId: String ->
      val call = findCall(callId)
        ?: throw Exception("Call not found: $callId")
      call.terminate()
    }

    AsyncFunction("setMuted") { _callId: String, muted: Boolean ->
      core?.isMicEnabled = !muted
    }

    AsyncFunction("setSpeaker") { on: Boolean ->
      val c = core ?: return@AsyncFunction
      val targetType = if (on) AudioDevice.Type.Speaker else AudioDevice.Type.Earpiece
      for (device in c.audioDevices) {
        if (device.type == targetType) {
          c.outputAudioDevice = device
          break
        }
      }
    }

    AsyncFunction("sendDtmf") { _callId: String, digit: String ->
      core?.currentCall?.sendDtmf(digit.firstOrNull() ?: return@AsyncFunction)
    }

    AsyncFunction("holdCall") { callId: String ->
      val call = findCall(callId)
        ?: throw Exception("Call not found: $callId")
      call.pause()
    }

    AsyncFunction("resumeCall") { callId: String ->
      val call = findCall(callId)
        ?: throw Exception("Call not found: $callId")
      call.resume()
    }

    AsyncFunction("getActiveCall") {
      core?.currentCall?.let { callInfoMap(it) }
    }

    // --- Audio ---

    AsyncFunction("getAudioDevices") {
      core?.audioDevices?.map { device ->
        mapOf(
          "id" to device.id,
          "name" to device.deviceName,
          "type" to audioDeviceTypeString(device.type),
        )
      } ?: emptyList()
    }

    AsyncFunction("setAudioDevice") { deviceId: String ->
      val c = core ?: return@AsyncFunction
      for (device in c.audioDevices) {
        if (device.id == deviceId) {
          c.outputAudioDevice = device
          break
        }
      }
    }

    // --- VoIP Push ---

    AsyncFunction("registerVoipPush") {
      // On Android, VoIP uses FCM high-priority data messages.
      // The FCM token is the same as regular push — return it.
      // The server differentiates by message type/priority.
      val context = appContext.reactContext ?: throw Exception("No context")
      com.google.firebase.messaging.FirebaseMessaging.getInstance()
        .token
        .addOnSuccessListener { token -> token }
        .addOnFailureListener { throw it }
      // Return a placeholder — actual token comes asynchronously
      "fcm-pending"
    }

    AsyncFunction("getRegistrationState") {
      account?.let { registrationStateToString(it.state) } ?: "none"
    }

    OnDestroy {
      shutdownCore()
    }
  }

  // --- Core Initialization ---

  private fun initializeCore() {
    if (core != null) return // Already initialized

    val context = appContext.reactContext
      ?: throw Exception("React context not available")

    val factory = Factory.instance()
    factory.setDebugMode(false, "LlamenosSip")

    val c = factory.createCore(null, null, context)

    // Audio codecs: prefer Opus, keep G.711 as fallback
    for (codec in c.audioPayloadTypes) {
      val mime = codec.mimeType.lowercase()
      codec.enable(mime == "opus" || mime == "pcmu" || mime == "pcma")
    }

    // Disable video
    c.isVideoEnabled = false

    // Default media encryption: SRTP mandatory
    c.mediaEncryption = MediaEncryption.SRTP
    c.isMediaEncryptionMandatory = true

    // DNS
    c.isDnsSetResolveEnabled = true

    // Add listener before starting
    c.addListener(coreListener)

    // Start core
    c.start()
    core = c

    // Set up ConnectionService for Android Telecom integration
    setupTelecomManager(context)

    // Start iterate loop (~20ms for Linphone event pump)
    val handler = android.os.Handler(android.os.Looper.getMainLooper())
    val runnable = object : Runnable {
      override fun run() {
        core?.iterate()
        handler.postDelayed(this, 20)
      }
    }
    handler.post(runnable)
    iterateRunnable = runnable
  }

  private fun shutdownCore() {
    iterateRunnable?.let {
      android.os.Handler(android.os.Looper.getMainLooper()).removeCallbacks(it)
    }
    iterateRunnable = null

    core?.removeListener(coreListener)
    core?.stop()
    core = null
    account = null
    callIds.clear()
  }

  // --- SIP Registration ---

  private fun registerSip(config: Map<String, Any>) {
    val c = core ?: throw Exception("Core not initialized")

    val domain = config["domain"] as String
    val username = config["username"] as String
    val password = config["password"] as String
    val transport = config["transport"] as? String ?: "tls"
    val displayName = config["displayName"] as? String ?: "Llamenos Volunteer"
    val mediaEncryption = config["mediaEncryption"] as? String ?: "srtp"

    // Create auth info
    val authInfo = Factory.instance().createAuthInfo(
      username, null, password, null, null, domain, null
    )
    c.addAuthInfo(authInfo)

    // Create account params
    val params = c.createAccountParams()

    // Identity
    val identity = Factory.instance().createAddress("sip:$username@$domain")
    identity?.displayName = displayName
    params.identityAddress = identity

    // Server address with transport
    val transportType = when (transport.lowercase()) {
      "tls" -> TransportType.Tls
      "tcp" -> TransportType.Tcp
      "udp" -> TransportType.Udp
      else -> TransportType.Tls
    }
    val serverAddr = Factory.instance().createAddress("sip:$domain")
    serverAddr?.transport = transportType
    params.serverAddress = serverAddr

    params.isRegisterEnabled = true
    params.isPublishEnabled = false

    // Media encryption
    c.mediaEncryption = when (mediaEncryption.lowercase()) {
      "zrtp" -> MediaEncryption.ZRTP
      "srtp" -> MediaEncryption.SRTP
      "dtls-srtp" -> MediaEncryption.DTLS
      else -> MediaEncryption.SRTP
    }
    c.isMediaEncryptionMandatory = (mediaEncryption != "none")

    // NAT/ICE configuration
    @Suppress("UNCHECKED_CAST")
    val iceServers = config["iceServers"] as? List<Map<String, Any>>
    if (!iceServers.isNullOrEmpty()) {
      val natPolicy = c.createNatPolicy()
      natPolicy?.isStunEnabled = true
      natPolicy?.isIceEnabled = true
      natPolicy?.isTurnEnabled = true

      iceServers.firstOrNull()?.let { first ->
        natPolicy?.stunServer = first["url"] as? String
        (first["username"] as? String)?.let { natPolicy?.stunServerUsername = it }
      }

      natPolicy?.resolve()
      params.natPolicy = natPolicy
    }

    // FCM push configuration
    params.pushNotificationConfig?.provider = "fcm"

    // Create and add account
    val acct = c.createAccount(params)
    c.addAccount(acct)
    c.defaultAccount = acct
    this.account = acct
  }

  private fun unregisterSip() {
    val acct = account ?: return
    val c = core ?: return

    val params = acct.params?.clone()
    params?.isRegisterEnabled = false
    acct.params = params
    c.removeAccount(acct)
    c.clearAllAuthInfo()
    this.account = null
  }

  // --- Call State Handling ---

  private fun handleCallStateChanged(call: Call, state: Call.State, message: String) {
    val callId = call.callLog?.callId ?: java.util.UUID.randomUUID().toString()
    val stateStr = callStateToString(state)

    when (state) {
      Call.State.IncomingReceived, Call.State.PushIncomingReceived -> {
        val remoteAddr = call.remoteAddress?.asStringUriOnly() ?: "unknown"
        val remoteName = call.remoteAddress?.displayName ?: ""

        callIds[callId] = callId

        // Report incoming call to ConnectionService
        reportIncomingCallToTelecom(callId, if (remoteName.isEmpty()) "Incoming Call" else remoteName)

        sendEvent("onCallReceived", mapOf(
          "callId" to callId,
          "remoteAddress" to remoteAddr,
          "displayName" to remoteName,
        ))
      }

      Call.State.Connected, Call.State.StreamsRunning -> {
        // Nothing special for Telecom — connection already active
      }

      Call.State.Released, Call.State.End, Call.State.Error -> {
        callIds.remove(callId)
      }

      else -> {}
    }

    sendEvent("onCallState", mapOf(
      "callId" to callId,
      "state" to stateStr,
      "info" to callInfoMap(call),
    ))

    // Check encryption on streams running
    if (state == Call.State.StreamsRunning) {
      val encryption = call.currentParams?.mediaEncryption ?: MediaEncryption.None
      sendEvent("onEncryptionChanged", mapOf(
        "callId" to callId,
        "encryption" to mediaEncryptionToString(encryption),
        "zrtpSas" to call.authenticationToken,
      ))
    }
  }

  private fun handleRegistrationStateChanged(account: Account, state: RegistrationState, message: String) {
    sendEvent("onRegistrationState", mapOf(
      "state" to registrationStateToString(state),
      "reason" to message,
    ))
  }

  // --- Telecom Manager (ConnectionService) ---

  private var telecomManager: TelecomManager? = null
  private var phoneAccountHandle: PhoneAccountHandle? = null

  private fun setupTelecomManager(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return // API 26+

    val tm = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager ?: return
    telecomManager = tm

    val componentName = ComponentName(context, LinphoneConnectionService::class.java)
    val handle = PhoneAccountHandle(componentName, "llamenos_voip")
    phoneAccountHandle = handle

    val phoneAccount = PhoneAccount.builder(handle, "Llamenos VoIP")
      .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
      .addSupportedUriScheme(PhoneAccount.SCHEME_SIP)
      .build()

    tm.registerPhoneAccount(phoneAccount)
  }

  private fun reportIncomingCallToTelecom(callId: String, displayName: String) {
    val tm = telecomManager ?: return
    val handle = phoneAccountHandle ?: return

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val extras = Bundle().apply {
      putString("callId", callId)
      putString("displayName", displayName)
      putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle)
    }

    try {
      tm.addNewIncomingCall(handle, extras)
    } catch (e: SecurityException) {
      // Permission not granted — fall back to notification
      showIncomingCallNotification(callId, displayName)
    }
  }

  private fun showIncomingCallNotification(callId: String, displayName: String) {
    // Fallback: show a high-priority notification when ConnectionService unavailable
    val context = appContext.reactContext ?: return
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
      as android.app.NotificationManager

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = android.app.NotificationChannel(
        "llamenos_voip",
        "VoIP Calls",
        android.app.NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Incoming VoIP call notifications"
        setSound(null, null)
        enableVibration(true)
      }
      notificationManager.createNotificationChannel(channel)
    }

    val notification = android.app.Notification.Builder(context, "llamenos_voip")
      .setContentTitle("Incoming Call")
      .setContentText(displayName)
      .setSmallIcon(android.R.drawable.sym_call_incoming)
      .setCategory(android.app.Notification.CATEGORY_CALL)
      .setFullScreenIntent(null, true)
      .setOngoing(true)
      .build()

    notificationManager.notify(callId.hashCode(), notification)
  }

  // --- Helpers ---

  private fun findCall(callId: String): Call? {
    val c = core ?: return null
    // Check current call first
    c.currentCall?.let {
      if (it.callLog?.callId == callId) return it
    }
    // Search all calls
    for (call in c.calls) {
      if (call.callLog?.callId == callId) return call
    }
    return null
  }

  private fun callInfoMap(call: Call): Map<String, Any?> {
    val callId = call.callLog?.callId ?: ""
    val isSpeaker = core?.outputAudioDevice?.type == AudioDevice.Type.Speaker
    return mapOf(
      "callId" to callId,
      "remoteAddress" to (call.remoteAddress?.asStringUriOnly() ?: ""),
      "displayName" to (call.remoteAddress?.displayName ?: ""),
      "duration" to call.duration,
      "state" to callStateToString(call.state),
      "isMuted" to !(core?.isMicEnabled ?: true),
      "isSpeaker" to isSpeaker,
      "mediaEncryption" to mediaEncryptionToString(call.currentParams?.mediaEncryption ?: MediaEncryption.None),
      "zrtpSas" to call.authenticationToken,
    )
  }

  private fun callStateToString(state: Call.State): String = when (state) {
    Call.State.Idle -> "idle"
    Call.State.IncomingReceived, Call.State.PushIncomingReceived, Call.State.IncomingEarlyMedia -> "incoming"
    Call.State.OutgoingInit, Call.State.OutgoingRinging, Call.State.OutgoingProgress, Call.State.OutgoingEarlyMedia -> "outgoing"
    Call.State.Connected -> "connecting"
    Call.State.StreamsRunning -> "connected"
    Call.State.Pausing, Call.State.Paused, Call.State.PausedByRemote -> "paused"
    Call.State.Resuming -> "resuming"
    Call.State.Released, Call.State.End -> "ended"
    Call.State.Error -> "error"
    else -> "idle"
  }

  private fun registrationStateToString(state: RegistrationState): String = when (state) {
    RegistrationState.None -> "none"
    RegistrationState.Progress -> "registering"
    RegistrationState.Ok -> "registered"
    RegistrationState.Failed -> "failed"
    RegistrationState.Cleared -> "cleared"
    else -> "none"
  }

  private fun mediaEncryptionToString(enc: MediaEncryption): String = when (enc) {
    MediaEncryption.SRTP -> "srtp"
    MediaEncryption.ZRTP -> "zrtp"
    MediaEncryption.DTLS -> "dtls-srtp"
    MediaEncryption.None -> "none"
    else -> "none"
  }

  private fun audioDeviceTypeString(type: AudioDevice.Type): String = when (type) {
    AudioDevice.Type.Earpiece -> "earpiece"
    AudioDevice.Type.Speaker -> "speaker"
    AudioDevice.Type.Bluetooth, AudioDevice.Type.BluetoothA2DP -> "bluetooth"
    AudioDevice.Type.Headphones, AudioDevice.Type.Headset -> "headset"
    else -> "unknown"
  }
}
