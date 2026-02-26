/**
 * Notes screen — view call notes.
 * Placeholder until Epic 84 implements full screens.
 */

import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'

export default function NotesScreen() {
  const { t } = useTranslation()

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-lg text-muted-foreground">
        {t('notes.empty', 'No notes yet')}
      </Text>
    </View>
  )
}
