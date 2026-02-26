/**
 * Zustand stores with MMKV persistence.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createMMKV } from 'react-native-mmkv'
import type { UserRole } from './types'
import type { ThemePref } from './theme'

const storage = createMMKV({ id: 'app-storage' })

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => { storage.remove(name) },
}

// --- Auth Store ---

interface AuthState {
  isAuthenticated: boolean
  publicKey: string | null
  role: UserRole | null
  isAdmin: boolean
  profileCompleted: boolean
  setAuth: (pubkey: string, role: UserRole) => void
  setProfileCompleted: (completed: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      publicKey: null,
      role: null,
      isAdmin: false,
      profileCompleted: false,
      setAuth: (pubkey, role) =>
        set({
          isAuthenticated: true,
          publicKey: pubkey,
          role,
          isAdmin: role === 'admin',
        }),
      setProfileCompleted: (completed) => set({ profileCompleted: completed }),
      clearAuth: () =>
        set({
          isAuthenticated: false,
          publicKey: null,
          role: null,
          isAdmin: false,
          profileCompleted: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        publicKey: state.publicKey,
        role: state.role,
        isAdmin: state.isAdmin,
        profileCompleted: state.profileCompleted,
      }),
    },
  ),
)

// --- Hub Config Store ---

interface HubConfigState {
  hubUrl: string | null
  hubName: string | null
  relayUrl: string | null
  serverPubkey: string | null
  setHubConfig: (config: {
    hubUrl: string
    hubName: string
    relayUrl?: string
    serverPubkey?: string
  }) => void
  clearHubConfig: () => void
}

export const useHubConfigStore = create<HubConfigState>()(
  persist(
    (set) => ({
      hubUrl: null,
      hubName: null,
      relayUrl: null,
      serverPubkey: null,
      setHubConfig: (config) =>
        set({
          hubUrl: config.hubUrl,
          hubName: config.hubName,
          relayUrl: config.relayUrl ?? null,
          serverPubkey: config.serverPubkey ?? null,
        }),
      clearHubConfig: () =>
        set({ hubUrl: null, hubName: null, relayUrl: null, serverPubkey: null }),
    }),
    {
      name: 'hub-config-storage',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
)

// --- Settings Store (persisted) ---

interface SettingsState {
  themePref: ThemePref
  language: string | null
  reduceMotion: boolean
  setThemePref: (pref: ThemePref) => void
  setLanguage: (lang: string) => void
  setReduceMotion: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePref: 'system',
      language: null,
      reduceMotion: false,
      setThemePref: (pref) => set({ themePref: pref }),
      setLanguage: (lang) => set({ language: lang }),
      setReduceMotion: (enabled) => set({ reduceMotion: enabled }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
)

// --- App State Store (non-persisted) ---

interface AppStateStore {
  isOnline: boolean
  setOnline: (online: boolean) => void
}

export const useAppStateStore = create<AppStateStore>()((set) => ({
  isOnline: true,
  setOnline: (online) => set({ isOnline: online }),
}))
