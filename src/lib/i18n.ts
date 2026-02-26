/**
 * i18n configuration for React Native using react-i18next (Epic 89 polish).
 *
 * - Device language detection via expo-localization
 * - Language persistence via MMKV (through Zustand settings store)
 * - RTL support for Arabic via I18nManager
 * - All 13 locale files bundled via Metro imports
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import { I18nManager } from 'react-native'

import en from '../locales/en.json'
import es from '../locales/es.json'
import zh from '../locales/zh.json'
import tl from '../locales/tl.json'
import vi from '../locales/vi.json'
import ar from '../locales/ar.json'
import fr from '../locales/fr.json'
import ht from '../locales/ht.json'
import ko from '../locales/ko.json'
import ru from '../locales/ru.json'
import hi from '../locales/hi.json'
import pt from '../locales/pt.json'
import de from '../locales/de.json'

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  tl: { translation: tl },
  vi: { translation: vi },
  ar: { translation: ar },
  fr: { translation: fr },
  ht: { translation: ht },
  ko: { translation: ko },
  ru: { translation: ru },
  hi: { translation: hi },
  pt: { translation: pt },
  de: { translation: de },
}

export const supportedLanguages = Object.keys(resources)
const RTL_LANGUAGES = ['ar']
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en'

i18n.use(initReactI18next).init({
  resources,
  lng: supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en',
  fallbackLng: 'en',
  supportedLngs: supportedLanguages,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

/** Check if current language is RTL */
export function isRTL(lang?: string): boolean {
  return RTL_LANGUAGES.includes(lang ?? i18n.language)
}

/**
 * Change language and update RTL layout.
 * Note: RTL changes via I18nManager.forceRTL require an app restart on Android.
 * Returns true if an app restart is needed for RTL changes.
 */
export function setLanguage(lang: string): boolean {
  i18n.changeLanguage(lang)
  const needsRTL = RTL_LANGUAGES.includes(lang)
  const needsRestart = I18nManager.isRTL !== needsRTL
  if (needsRestart) {
    I18nManager.forceRTL(needsRTL)
  }
  return needsRestart
}

/** Language display names for the settings picker */
export const languageLabels: Record<string, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  tl: 'Tagalog',
  vi: 'Tiếng Việt',
  ar: 'العربية',
  fr: 'Français',
  ht: 'Kreyòl Ayisyen',
  ko: '한국어',
  ru: 'Русский',
  hi: 'हिन्दी',
  pt: 'Português',
  de: 'Deutsch',
}

export default i18n
