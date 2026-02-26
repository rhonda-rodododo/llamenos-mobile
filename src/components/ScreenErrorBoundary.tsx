/**
 * Error boundary wrapper per-screen (Epic 89).
 *
 * Catches React render errors and shows a retry UI.
 * Each tab/screen should be wrapped independently so one crash
 * doesn't take down the whole app.
 */

import { View, Text, Pressable } from 'react-native'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

function ErrorFallback({ error: rawError, resetErrorBoundary }: FallbackProps) {
  const error = rawError instanceof Error ? rawError : new Error(String(rawError))
  const { t } = useTranslation()

  return (
    <View
      className="flex-1 items-center justify-center bg-background p-8"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text className="mb-2 text-lg font-bold text-foreground">
        {t('common.somethingWentWrong', 'Something went wrong')}
      </Text>
      <Text
        className="mb-6 text-center text-sm text-muted-foreground"
        numberOfLines={3}
      >
        {error.message}
      </Text>
      <Pressable
        onPress={resetErrorBoundary}
        className="rounded-lg bg-primary px-6 py-3"
        accessibilityLabel={t('common.tryAgain', 'Try Again')}
        accessibilityRole="button"
      >
        <Text className="text-sm font-semibold text-primary-foreground">
          {t('common.tryAgain', 'Try Again')}
        </Text>
      </Pressable>
    </View>
  )
}

export function ScreenErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  )
}
