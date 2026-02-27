/**
 * Custom field input renderers for note forms (Epic 127).
 * Renders appropriate input controls based on field type.
 */

import { useState } from 'react'
import { View, Text, TextInput, Switch, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { CustomFieldDefinition } from '@/lib/types'

interface CustomFieldInputsProps {
  fields: CustomFieldDefinition[]
  values: Record<string, string | number | boolean>
  onChange: (name: string, value: string | number | boolean) => void
  isAdmin: boolean
}

export function CustomFieldInputs({ fields, values, onChange, isAdmin }: CustomFieldInputsProps) {
  const { t } = useTranslation()

  if (fields.length === 0) return null

  return (
    <View className="gap-3">
      <Text className="text-sm font-medium text-muted-foreground">
        {t('notes.fields', 'Custom Fields')}
      </Text>
      {fields.map(field => {
        const editable = isAdmin || field.editableByVolunteers
        const value = values[field.name]

        switch (field.type) {
          case 'text':
            return (
              <View key={field.id}>
                <Text className="mb-1 text-xs text-muted-foreground">
                  {field.label}
                  {field.required && <Text className="text-destructive"> *</Text>}
                </Text>
                <TextInput
                  className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  value={String(value ?? '')}
                  onChangeText={v => onChange(field.name, v)}
                  editable={editable}
                  placeholder={field.label}
                  testID={`custom-field-${field.name}`}
                />
              </View>
            )

          case 'textarea':
            return (
              <View key={field.id}>
                <Text className="mb-1 text-xs text-muted-foreground">
                  {field.label}
                  {field.required && <Text className="text-destructive"> *</Text>}
                </Text>
                <TextInput
                  className="min-h-[60px] rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  value={String(value ?? '')}
                  onChangeText={v => onChange(field.name, v)}
                  editable={editable}
                  multiline
                  placeholder={field.label}
                  testID={`custom-field-${field.name}`}
                />
              </View>
            )

          case 'number':
            return (
              <View key={field.id}>
                <Text className="mb-1 text-xs text-muted-foreground">
                  {field.label}
                  {field.required && <Text className="text-destructive"> *</Text>}
                </Text>
                <TextInput
                  className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                  value={value != null ? String(value) : ''}
                  onChangeText={v => {
                    const num = Number(v)
                    onChange(field.name, isNaN(num) ? v : num)
                  }}
                  editable={editable}
                  keyboardType="numeric"
                  placeholder={field.label}
                  testID={`custom-field-${field.name}`}
                />
              </View>
            )

          case 'checkbox':
            return (
              <View key={field.id} className="flex-row items-center justify-between">
                <Text className="text-sm text-foreground">
                  {field.label}
                  {field.required && <Text className="text-destructive"> *</Text>}
                </Text>
                <Switch
                  value={!!value}
                  onValueChange={v => onChange(field.name, v)}
                  disabled={!editable}
                  testID={`custom-field-${field.name}`}
                />
              </View>
            )

          case 'select':
            return (
              <SelectField
                key={field.id}
                field={field}
                value={String(value ?? '')}
                onChange={v => onChange(field.name, v)}
                editable={editable}
              />
            )

          default:
            return null
        }
      })}
    </View>
  )
}

function SelectField({
  field,
  value,
  onChange,
  editable,
}: {
  field: CustomFieldDefinition
  value: string
  onChange: (v: string) => void
  editable: boolean
}) {
  const [showOptions, setShowOptions] = useState(false)
  const options = field.options ?? []

  return (
    <View>
      <Text className="mb-1 text-xs text-muted-foreground">
        {field.label}
        {field.required && <Text className="text-destructive"> *</Text>}
      </Text>
      <Pressable
        className="rounded-lg border border-border px-3 py-2.5"
        onPress={() => editable && setShowOptions(!showOptions)}
        testID={`custom-field-${field.name}`}
      >
        <Text className={`text-sm ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
          {value || field.label}
        </Text>
      </Pressable>
      {showOptions && (
        <View className="mt-1 rounded-lg border border-border bg-card">
          {options.map(opt => (
            <Pressable
              key={opt}
              className={`border-b border-border px-3 py-2 ${value === opt ? 'bg-primary/10' : ''}`}
              onPress={() => { onChange(opt); setShowOptions(false) }}
            >
              <Text className={`text-sm ${value === opt ? 'font-semibold text-primary' : 'text-foreground'}`}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

