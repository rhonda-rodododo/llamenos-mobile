/**
 * VoIP configuration — maps server SIP token responses to Linphone SipConfig.
 *
 * The server returns standardized SIP parameters via GET /api/telephony/sip-token.
 * This module translates provider-specific details into the format expected by
 * the LlamenosSip native module.
 */

import type { SipConfig, MediaEncryptionMode } from '../../modules/llamenos-sip'
import { api } from './api-client'

/** Server response from GET /api/telephony/sip-token */
export interface SipTokenResponse {
  provider: string
  sip: {
    domain: string
    transport: 'tls' | 'tcp' | 'udp'
    username: string
    password: string
    iceServers: Array<{ url: string; username?: string; credential?: string }>
    mediaEncryption: MediaEncryptionMode
  }
}

/**
 * Fetch SIP connection parameters from the server and build a SipConfig
 * suitable for the LlamenosSip native module.
 */
export async function getSipConfig(): Promise<SipConfig> {
  const response = await api.get<SipTokenResponse>('/api/telephony/sip-token')
  const { sip } = response

  return {
    domain: sip.domain,
    transport: sip.transport,
    username: sip.username,
    password: sip.password,
    displayName: 'Llamenos Volunteer',
    iceServers: sip.iceServers,
    mediaEncryption: sip.mediaEncryption,
    preferredCodec: 'opus',
  }
}

/**
 * Register VoIP push token with the server so it can dispatch
 * VoIP-specific push notifications for incoming calls.
 */
export async function registerVoipPushToken(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  await api.post('/api/devices/voip-token', {
    platform,
    voipToken: token,
  })
}

/**
 * Unregister VoIP push token from the server.
 */
export async function unregisterVoipPushToken(): Promise<void> {
  await api.delete('/api/devices/voip-token')
}
