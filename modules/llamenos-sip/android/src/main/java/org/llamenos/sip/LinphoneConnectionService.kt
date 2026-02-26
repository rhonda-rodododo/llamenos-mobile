package org.llamenos.sip

import android.os.Build
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.DisconnectCause
import android.telecom.PhoneAccountHandle
import androidx.annotation.RequiresApi
import org.linphone.core.Factory

/**
 * Android ConnectionService for self-managed VoIP calls.
 *
 * This enables proper integration with the Android Telecom framework:
 * - Incoming call notifications with full-screen intent
 * - Proper audio focus management
 * - DO NOT DISTURB bypass for calls
 * - Automotive/Bluetooth integration
 */
@RequiresApi(Build.VERSION_CODES.O)
class LinphoneConnectionService : ConnectionService() {

  override fun onCreateIncomingConnection(
    connectionManagerPhoneAccount: PhoneAccountHandle?,
    request: ConnectionRequest?
  ): Connection {
    val callId = request?.extras?.getString("callId") ?: ""
    val displayName = request?.extras?.getString("displayName") ?: "Incoming Call"

    val connection = LinphoneConnection(callId).apply {
      setInitializing()
      connectionCapabilities = Connection.CAPABILITY_MUTE or
        Connection.CAPABILITY_HOLD or
        Connection.CAPABILITY_SUPPORT_HOLD
      connectionProperties = Connection.PROPERTY_SELF_MANAGED
      setCallerDisplayName(displayName, android.telecom.TelecomManager.PRESENTATION_ALLOWED)
    }

    // Signal ringing state
    connection.setRinging()
    return connection
  }

  override fun onCreateIncomingConnectionFailed(
    connectionManagerPhoneAccount: PhoneAccountHandle?,
    request: ConnectionRequest?
  ) {
    // ConnectionService creation failed — call will still be handled by Linphone Core
    // but without native Telecom integration
  }

  override fun onCreateOutgoingConnection(
    connectionManagerPhoneAccount: PhoneAccountHandle?,
    request: ConnectionRequest?
  ): Connection {
    val connection = LinphoneConnection("").apply {
      setInitializing()
      connectionProperties = Connection.PROPERTY_SELF_MANAGED
    }
    connection.setDialing()
    return connection
  }

  override fun onCreateOutgoingConnectionFailed(
    connectionManagerPhoneAccount: PhoneAccountHandle?,
    request: ConnectionRequest?
  ) {
    // Outgoing connection failed
  }
}

/**
 * Represents a single VoIP call connection in the Android Telecom framework.
 */
@RequiresApi(Build.VERSION_CODES.O)
class LinphoneConnection(private val callId: String) : Connection() {

  override fun onAnswer() {
    // User accepted via native UI — delegate to Linphone Core
    val core = Factory.instance().createCore(null, null, null)
    core.currentCall?.accept()
    setActive()
  }

  override fun onReject() {
    // User declined via native UI
    val core = Factory.instance().createCore(null, null, null)
    core.currentCall?.decline(org.linphone.core.Reason.Declined)
    setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
    destroy()
  }

  override fun onDisconnect() {
    // User hung up
    val core = Factory.instance().createCore(null, null, null)
    core.currentCall?.terminate()
    setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
    destroy()
  }

  override fun onHold() {
    val core = Factory.instance().createCore(null, null, null)
    core.currentCall?.pause()
    setOnHold()
  }

  override fun onUnhold() {
    val core = Factory.instance().createCore(null, null, null)
    core.currentCall?.resume()
    setActive()
  }

  override fun onPlayDtmfTone(c: Char) {
    val core = Factory.instance().createCore(null, null, null)
    core.currentCall?.sendDtmf(c)
  }

  override fun onSilence() {
    // Silence the ringer
  }
}
