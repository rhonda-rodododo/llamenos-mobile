/**
 * i18n configuration for React Native using react-i18next.
 * Uses expo-localization for device language detection.
 * Translations bundled via Metro imports (no HTTP backend).
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'

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

const supportedLngs = Object.keys(resources)
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en'

i18n.use(initReactI18next).init({
  resources,
  lng: supportedLngs.includes(deviceLanguage) ? deviceLanguage : 'en',
  fallbackLng: 'en',
  supportedLngs,
  interpolation: { escapeValue: false },
  react: { useSuspense: false }, // Required for React Native
})

export default i18n
