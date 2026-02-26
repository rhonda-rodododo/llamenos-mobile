/**
 * API client for communicating with the Llamenos server.
 *
 * Handles Schnorr signature authentication (BIP-340) on every request,
 * matching the web app's auth token format.
 */

import * as keyManager from './key-manager'
import { useHubConfigStore } from './store'
import type { AuthToken } from './types'

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
