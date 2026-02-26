/**
 * API client for communicating with the Llamenos server.
 *
 * Handles Schnorr signature authentication (BIP-340) on every request,
 * matching the web app's auth token format.
 */

import * as keyManager from './key-manager'
import { useHubConfigStore } from './store'
import type {
  AuthToken,
  ActiveCall,
  CallRecord,
  ShiftStatus,
  Shift,
  EncryptedNote,
  Volunteer,
  BanEntry,
  AuditEntry,
  Conversation,
  ConversationMessage,
  CustomFieldDefinition,
} from './types'

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API error ${status}: ${body}`)
    this.name = 'ApiError'
  }
}

class ApiClient {
  get baseUrl(): string {
    const url = useHubConfigStore.getState().hubUrl
    if (!url) throw new Error('Hub URL not configured')
    return url
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000)
    const tokenJson = keyManager.createAuthToken(timestamp, method, path)
    const token: AuthToken = JSON.parse(tokenJson)

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Pubkey': token.pubkey,
        'X-Auth-Timestamp': String(token.timestamp),
        'X-Auth-Token': token.token,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new ApiError(res.status, text)
    }

    const contentType = res.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return res.json()
    }
    return res.text() as unknown as T
  }

  get<T>(path: string) {
    return this.request<T>('GET', path)
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, body)
  }
  delete<T>(path: string) {
    return this.request<T>('DELETE', path)
  }
}

export const api = new ApiClient()

/**
 * Fetch hub config from a hub URL (unauthenticated).
 * Used during initial setup to discover relay URL, hub name, etc.
 */
export async function fetchHubConfig(hubUrl: string): Promise<{
  name: string
  relayUrl?: string
  serverPubkey?: string
  features?: string[]
}> {
  const res = await fetch(`${hubUrl}/api/config`)
  if (!res.ok) {
    throw new ApiError(res.status, await res.text())
  }
  return res.json()
}

// --- Calls ---

export function listActiveCalls() {
  return api.get<{ calls: ActiveCall[] }>('/api/calls/active')
}

export function getCallsTodayCount() {
  return api.get<{ count: number }>('/api/calls/today-count')
}

export function getCallHistory(params?: { page?: number; limit?: number; search?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.search) searchParams.set('search', params.search)
  const qs = searchParams.toString()
  return api.get<{ calls: CallRecord[]; total: number }>(`/api/calls${qs ? `?${qs}` : ''}`)
}

export function answerCall(callId: string) {
  return api.post<{ success: boolean }>(`/api/calls/${callId}/answer`)
}

export function hangupCall(callId: string) {
  return api.post<{ success: boolean }>(`/api/calls/${callId}/hangup`)
}

export function reportCallSpam(callId: string) {
  return api.post<{ success: boolean }>(`/api/calls/${callId}/report-spam`)
}

// --- Shifts ---

export function getMyShiftStatus() {
  return api.get<ShiftStatus>('/api/shifts/my-status')
}

export function listShifts() {
  return api.get<{ shifts: Shift[] }>('/api/shifts')
}

export function signUpForShift(shiftId: string) {
  return api.post<{ success: boolean }>(`/api/shifts/${shiftId}/signup`)
}

export function dropShift(shiftId: string) {
  return api.delete<{ success: boolean }>(`/api/shifts/${shiftId}/signup`)
}

// --- Notes ---

export function listNotes(params?: { callId?: string; page?: number; limit?: number }) {
  const searchParams = new URLSearchParams()
  if (params?.callId) searchParams.set('callId', params.callId)
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit ?? 50))
  const qs = searchParams.toString()
  return api.get<{ notes: EncryptedNote[]; total: number }>(`/api/notes${qs ? `?${qs}` : ''}`)
}

export function createNote(data: {
  callId: string
  encryptedContent: string
  authorEnvelope: { wrappedKey: string; ephemeralPubkey: string }
  adminEnvelopes?: { pubkey: string; wrappedKey: string; ephemeralPubkey: string }[]
}) {
  return api.post<{ id: string }>('/api/notes', data)
}

export function updateNote(noteId: string, data: {
  encryptedContent: string
  authorEnvelope: { wrappedKey: string; ephemeralPubkey: string }
  adminEnvelopes?: { pubkey: string; wrappedKey: string; ephemeralPubkey: string }[]
}) {
  return api.put<{ success: boolean }>(`/api/notes/${noteId}`, data)
}

// --- Volunteers ---

export function listVolunteers() {
  return api.get<{ volunteers: Volunteer[] }>('/api/volunteers')
}

export function getVolunteerPresence() {
  return api.get<{ volunteers: Array<{ pubkey: string; status: string }> }>('/api/volunteers/presence')
}

// --- Custom Fields ---

export function getCustomFields() {
  return api.get<{ fields: CustomFieldDefinition[] }>('/api/custom-fields')
}

// --- Profile ---

export function updateMyAvailability(data: { onBreak: boolean }) {
  return api.put<{ success: boolean }>('/api/me/availability', data)
}

export function updateMyProfile(data: { name?: string; phone?: string; spokenLanguages?: string[] }) {
  return api.put<{ success: boolean }>('/api/me/profile', data)
}

export function getMe() {
  return api.get<{
    pubkey: string
    name: string
    roles: string[]
    permissions: string[]
    profileCompleted: boolean
    onBreak: boolean
    callPreference: string
  }>('/api/auth/me')
}

// --- Admin: Bans ---

export function listBans() {
  return api.get<{ bans: BanEntry[] }>('/api/bans')
}

export function addBan(data: { phoneHash: string; reason?: string }) {
  return api.post<{ id: string }>('/api/bans', data)
}

export function removeBan(banId: string) {
  return api.delete<{ success: boolean }>(`/api/bans/${banId}`)
}

// --- Admin: Audit Log ---

export function getAuditLog(params?: { page?: number; limit?: number; action?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit ?? 50))
  if (params?.action) searchParams.set('action', params.action)
  const qs = searchParams.toString()
  return api.get<{ entries: AuditEntry[]; total: number }>(`/api/audit${qs ? `?${qs}` : ''}`)
}

// --- Conversations ---

export function listConversations() {
  return api.get<{ conversations: Conversation[] }>('/api/conversations')
}

export function getConversationMessages(conversationId: string) {
  return api.get<{ messages: ConversationMessage[] }>(`/api/conversations/${conversationId}/messages`)
}
