import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

async function loadLocale(lang: string) {
  switch (lang) {
    case 'zh-CN':
      return (await import('./locales/zh-CN.json')).default
    case 'ja-JP':
      return (await import('./locales/ja-JP.json')).default
    default:
      return (await import('./locales/en-US.json')).default
  }
}

export const SUPPORTED_LANGS = ['en-US', 'zh-CN', 'ja-JP'] as const
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

export function detectLang(): SupportedLang {
  const nav = navigator.language
  if (nav.startsWith('zh')) return 'zh-CN'
  if (nav.startsWith('ja')) return 'ja-JP'
  return 'en-US'
}

export async function initI18n(lang: SupportedLang = detectLang()) {
  const resources = await loadLocale(lang)
  await i18n.use(initReactI18next).init({
    lng: lang,
    resources: { [lang]: { translation: resources } },
    interpolation: { escapeValue: false },
    fallbackLng: false,
  })
  return i18n
}

export async function changeLanguage(lang: SupportedLang) {
  if (!i18n.hasResourceBundle(lang, 'translation')) {
    const resources = await loadLocale(lang)
    i18n.addResourceBundle(lang, 'translation', resources)
  }
  await i18n.changeLanguage(lang)
}

export default i18n
