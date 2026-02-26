/**
 * Onboarding screen — keypair generation + PIN setup.
 * Also handles nsec import (when navigated with nsec param).
 */

import { useState, useCallback } from 'react'
import { View, Text, Pressable, Alert, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as Clipboard from 'expo-clipboard'
import { PinInput } from '@/components/PinInput'
import { generateKeyPair, keyPairFromNsec } from '@/lib/crypto'
import * as keyManager from '@/lib/key-manager'
import { useAuthStore } from '@/lib/store'
import { isValidPin } from '@/lib/key-store'

type Step = 'generate' | 'backup' | 'pin' | 'confirm'

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ nsec?: string; mode?: string }>()
  const setAuth = useAuthStore(s => s.setAuth)

  const isImport = params.mode === 'import' && params.nsec
  const [step, setStep] = useState<Step>(isImport ? 'pin' : 'generate')
  const [nsec, setNsec] = useState<string | null>(params.nsec ?? null)
  const [npub, setNpub] = useState<string | null>(null)
  const [pin, setPin] = useState<string | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(() => {
    const kp = generateKeyPair()
    setNsec(kp.nsec)
    setNpub(kp.npub)
    setStep('backup')
  }, [])

  const handleCopyNsec = useCallback(async () => {
    if (!nsec) return
    await Clipboard.setStringAsync(nsec)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }, [nsec])

  const handleBackupConfirm = useCallback(() => {
    setStep('pin')
  }, [])

  const handlePinSet = useCallback((enteredPin: string) => {
    if (!isValidPin(enteredPin)) {
      setPinError(t('auth.invalidPin', 'PIN must be 4-6 digits'))
      return
    }
    setPin(enteredPin)
    setPinError(null)
    setStep('confirm')
  }, [t])

  const handlePinConfirm = useCallback(async (confirmPin: string) => {
    if (confirmPin !== pin) {
      setPinError(t('auth.pinMismatch', 'PINs do not match'))
      return
    }
    if (!nsec || !pin) return

    setLoading(true)
    setPinError(null)

    try {
      // If importing, validate the nsec first
      if (isImport) {
        const kp = keyPairFromNsec(nsec)
        if (!kp) {
          Alert.alert(t('auth.invalidNsec', 'Invalid nsec'))
          setLoading(false)
          return
        }
      }

      const pubkey = await keyManager.importKey(nsec, pin)
      setAuth(pubkey, 'volunteer')
      router.replace('/(tabs)')
    } catch (err) {
      setPinError(t('auth.importError', 'Failed to save key'))
    } finally {
      setLoading(false)
    }
  }, [pin, nsec, isImport, setAuth, t])

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-1 items-center justify-center px-6 py-12"
    >
      {/* Step 1: Generate */}
      {step === 'generate' && (
        <View className="w-full max-w-sm items-center gap-6">
          <Text className="text-2xl font-bold text-foreground">
            {t('onboarding.title', 'Create Your Identity')}
          </Text>
          <Text className="text-center text-base text-muted-foreground">
            {t('onboarding.description', 'Generate a cryptographic keypair. This is your identity — it never leaves your device.')}
          </Text>
          <Pressable
            className="w-full rounded-lg bg-primary px-6 py-4"
            onPress={handleGenerate}
          >
            <Text className="text-center text-lg font-semibold text-primary-foreground">
              {t('onboarding.generate', 'Generate Keypair')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Step 2: Backup nsec */}
      {step === 'backup' && nsec && (
        <View className="w-full max-w-sm gap-6">
          <Text className="text-2xl font-bold text-foreground">
            {t('onboarding.backupTitle', 'Back Up Your Key')}
          </Text>

          <View className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <Text className="mb-2 text-sm font-semibold text-destructive">
              {t('onboarding.warning', 'Save this key somewhere safe. If you lose it, your identity cannot be recovered.')}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-muted-foreground">
              {t('onboarding.secretKey', 'Secret Key (nsec)')}
            </Text>
            <View className="rounded-lg border border-border bg-card p-3">
              <Text className="font-mono text-xs text-foreground" selectable>
                {nsec}
              </Text>
            </View>
          </View>

          {npub && (
            <View className="gap-2">
              <Text className="text-sm font-medium text-muted-foreground">
                {t('onboarding.publicKey', 'Public Key (npub)')}
              </Text>
              <View className="rounded-lg border border-border bg-card p-3">
                <Text className="font-mono text-xs text-muted-foreground" selectable>
                  {npub}
                </Text>
              </View>
            </View>
          )}

          <Pressable
            className="rounded-lg border border-border bg-card px-4 py-3"
            onPress={handleCopyNsec}
          >
            <Text className="text-center font-medium text-foreground">
              {copied
                ? t('onboarding.copied', 'Copied!')
                : t('onboarding.copy', 'Copy Secret Key')}
            </Text>
          </Pressable>

          <Pressable
            className="rounded-lg bg-primary px-4 py-3"
            onPress={handleBackupConfirm}
          >
            <Text className="text-center font-semibold text-primary-foreground">
              {t('onboarding.continue', "I've saved my key")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Step 3: Set PIN */}
      {step === 'pin' && (
        <View className="items-center gap-6">
          <Text className="text-2xl font-bold text-foreground">
            {t('onboarding.setPinTitle', 'Set a PIN')}
          </Text>
          <Text className="text-center text-base text-muted-foreground">
            {t('onboarding.setPinDescription', 'This PIN protects your key on this device.')}
          </Text>
          <PinInput
            onComplete={handlePinSet}
            error={pinError}
            disabled={loading}
          />
        </View>
      )}

      {/* Step 4: Confirm PIN */}
      {step === 'confirm' && (
        <View className="items-center gap-6">
          <Text className="text-2xl font-bold text-foreground">
            {t('onboarding.confirmPinTitle', 'Confirm PIN')}
          </Text>
          <Text className="text-center text-base text-muted-foreground">
            {t('onboarding.confirmPinDescription', 'Enter your PIN again to confirm.')}
          </Text>
          <PinInput
            onComplete={handlePinConfirm}
            error={pinError}
            disabled={loading}
          />
          <Pressable onPress={() => { setStep('pin'); setPin(null); setPinError(null) }}>
            <Text className="text-sm text-muted-foreground">
              {t('onboarding.changePin', 'Change PIN')}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}
