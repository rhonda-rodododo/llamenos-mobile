/**
 * Shifts screen — view and manage shift schedule.
 * Placeholder until Epic 84 implements full screens.
 */

import { View, Text } from 'react-native'
import { useTranslation } from 'react-i18next'

export default function ShiftsScreen() {
  const { t } = useTranslation()

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-lg text-muted-foreground">
        {t('shifts.empty', 'No shifts scheduled')}
      </Text>
    </View>
  )
}
