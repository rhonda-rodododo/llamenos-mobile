/**
 * Login screen — PIN unlock for returning users, import for new users.
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { PinInput } from '@/components/PinInput'
import * as keyManager from '@/lib/key-manager'
import { hasStoredKey } from '@/lib/key-store'
import { isValidNsec } from '@/lib/crypto'
import { useAuthStore, useHubConfigStore } from '@/lib/store'
import { fetchHubConfig } from '@/lib/api-client'
import { useFocusEffect } from 'expo-router'

const MAX_PIN_ATTEMPTS = 10

export default function LoginScreen() {
  const { t } = useTranslation()
  const setAuth = useAuthStore(s => s.setAuth)
  const hubUrl = useHubConfigStore(s => s.hubUrl)
  const hubName = useHubConfigStore(s => s.hubName)
  const setHubConfig = useHubConfigStore(s => s.setHubConfig)

  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [nsecInput, setNsecInput] = useState('')
  const [hubUrlInput, setHubUrlInput] = useState(hubUrl ?? '')

  // Check if user has a stored key on focus
  useFocusEffect(
    useCallback(() => {
      hasStoredKey().then(setHasKey)
    }, []),
  )

  const handlePinComplete = useCallback(async (pin: string) => {
    if (loading) return
    setLoading(true)
    setPinError(null)

    try {
      const pubkey = await keyManager.unlock(pin)
      if (pubkey) {
        // Fetch role from API
        setAuth(pubkey, 'volunteer') // Default role, API will update
        router.replace('/(tabs)')
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          await keyManager.wipeKey()
          Alert.alert(
            t('auth.wipedTitle', 'Key Wiped'),
            t('auth.wipedMessage', 'Maximum PIN attempts exceeded. Your key has been wiped for security.'),
          )
          setHasKey(false)
        } else {
          setPinError(
            t('auth.wrongPin', 'Wrong PIN. {{remaining}} attempts remaining.', {
              remaining: MAX_PIN_ATTEMPTS - newAttempts,
            }),
          )
        }
      }
    } catch {
      setPinError(t('auth.unlockError', 'Failed to unlock'))
    } finally {
      setLoading(false)
    }
  }, [attempts, loading, setAuth, t])

  const handleImportNsec = useCallback(async () => {
    if (!nsecInput.trim() || !isValidNsec(nsecInput.trim())) {
      Alert.alert(t('auth.invalidNsec', 'Invalid nsec'), t('auth.invalidNsecMessage', 'Please enter a valid nsec key.'))
      return
    }
    // Navigate to set PIN after import
    router.push({
      pathname: '/onboarding',
      params: { nsec: nsecInput.trim(), mode: 'import' },
    })
  }, [nsecInput, t])

  const handleHubConnect = useCallback(async () => {
    if (!hubUrlInput.trim()) return
    setLoading(true)
    try {
      const url = hubUrlInput.trim().replace(/\/$/, '')
      const config = await fetchHubConfig(url)
      setHubConfig({
        hubUrl: url,
        hubName: config.name,
        relayUrl: config.relayUrl,
        serverPubkey: config.serverPubkey,
      })
    } catch {
      Alert.alert(
        t('auth.connectionError', 'Connection Error'),
        t('auth.connectionErrorMessage', 'Could not connect to the hub. Check the URL and try again.'),
      )
    } finally {
      setLoading(false)
    }
  }, [hubUrlInput, setHubConfig, t])

  if (hasKey === null) {
    return <View className="flex-1 items-center justify-center bg-background" />
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="login-screen"
    >
      <View className="flex-1 items-center justify-center px-6">
        {/* Hub name / connection */}
        <Text
          className="mb-2 text-3xl font-bold text-foreground"
          accessibilityRole="header"
        >
          {hubName ?? t('app.name', 'Hotline')}
        </Text>
        <Text className="mb-8 text-base text-muted-foreground">
          {t('auth.subtitle', 'Crisis Response')}
        </Text>

        {/* Hub URL input (if not configured) */}
        {!hubUrl && (
          <View className="mb-8 w-full max-w-sm gap-3">
            <Text className="text-sm font-medium text-foreground">
              {t('auth.hubUrl', 'Hub URL')}
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-card px-4 py-3 text-foreground"
              placeholder="https://app.example.org"
              value={hubUrlInput}
              onChangeText={setHubUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel={t('auth.hubUrl', 'Hub URL')}
              accessibilityHint={t('a11y.hubUrlHint', 'Enter the URL of your crisis hub server')}
              testID="login-hub-url-input"
            />
            <Pressable
              className="rounded-lg bg-primary px-4 py-3"
              onPress={handleHubConnect}
              disabled={loading}
              accessibilityLabel={t('auth.connect', 'Connect')}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              testID="login-connect-btn"
            >
              <Text className="text-center font-semibold text-primary-foreground">
                {t('auth.connect', 'Connect')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* PIN unlock (returning user) */}
        {hubUrl && hasKey && !showImport && (
          <View className="items-center gap-6">
            <Text className="text-lg text-foreground" accessibilityRole="header">
              {t('auth.enterPin', 'Enter your PIN')}
            </Text>
            <PinInput
              onComplete={handlePinComplete}
              error={pinError}
              disabled={loading}
            />
            <Pressable
              onPress={() => setShowImport(true)}
              accessibilityLabel={t('auth.importKey', 'Import a different key')}
              accessibilityRole="button"
              accessibilityHint={t('a11y.importKeyHint', 'Switch to importing a different nsec key')}
            >
              <Text className="text-sm text-primary">
                {t('auth.importKey', 'Import a different key')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Import nsec (new user or switching keys) */}
        {hubUrl && (!hasKey || showImport) && (
          <View className="w-full max-w-sm gap-4">
            <Text className="text-lg font-medium text-foreground" accessibilityRole="header">
              {t('auth.importTitle', 'Import Your Key')}
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-foreground"
              placeholder="nsec1..."
              value={nsecInput}
              onChangeText={setNsecInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              multiline
              accessibilityLabel={t('auth.nsecInput', 'Secret key')}
              accessibilityHint={t('a11y.nsecInputHint', 'Paste your nsec private key here')}
              testID="login-nsec-input"
            />
            <Pressable
              className="rounded-lg bg-primary px-4 py-3"
              onPress={handleImportNsec}
              disabled={loading}
              accessibilityLabel={t('auth.import', 'Import & Set PIN')}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading }}
              testID="login-import-btn"
            >
              <Text className="text-center font-semibold text-primary-foreground">
                {t('auth.import', 'Import & Set PIN')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/onboarding')}
              accessibilityLabel={t('auth.generateNew', 'Generate a new keypair')}
              accessibilityRole="button"
              accessibilityHint={t('a11y.generateHint', 'Creates a new cryptographic identity')}
              testID="login-generate-btn"
            >
              <Text className="text-center text-sm text-primary">
                {t('auth.generateNew', 'Generate a new keypair')}
              </Text>
            </Pressable>

            {hasKey && showImport && (
              <Pressable
                onPress={() => setShowImport(false)}
                accessibilityLabel={t('auth.backToPin', 'Back to PIN unlock')}
                accessibilityRole="button"
              >
                <Text className="text-center text-sm text-muted-foreground">
                  {t('auth.backToPin', 'Back to PIN unlock')}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
