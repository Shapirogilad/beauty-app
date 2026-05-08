import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import he from '../i18n/he.json'

i18n.use(initReactI18next).init({
  resources: { he: { translation: he } },
  lng: 'he',
  fallbackLng: 'he',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',  // suppress Intl.PluralRules warning in Expo Go
})

export default i18n
