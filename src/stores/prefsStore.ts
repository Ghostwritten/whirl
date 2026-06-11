import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { changeLanguage, detectLang, type SupportedLang } from '@/i18n'

export type ThemeId = 'neon' | 'candy' | 'dark' | 'minimal'
export type FontId = 'inter' | 'serif' | 'mono'

export const FONT_STACKS: Record<FontId, string> = {
  inter: "'Inter', 'Noto Sans SC', 'Noto Sans JP', system-ui, sans-serif",
  serif: "'Georgia', 'Noto Serif SC', 'Noto Serif JP', serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Noto Sans Mono', monospace",
}

interface PrefsState {
  themeId: ThemeId
  fontId: FontId
  language: SupportedLang
  volumeBgm: number
  volumeSfx: number
  reducedMotion: boolean
  setTheme: (id: ThemeId) => void
  setFont: (id: FontId) => void
  setLanguage: (lang: SupportedLang) => void
  setVolumeBgm: (v: number) => void
  setVolumeSfx: (v: number) => void
  setReducedMotion: (v: boolean) => void
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      themeId: 'neon',
      fontId: 'inter',
      language: detectLang(),
      volumeBgm: 0.4,
      volumeSfx: 0.7,
      reducedMotion: false,

      setTheme(id) {
        document.documentElement.setAttribute('data-theme', id)
        set({ themeId: id })
      },
      setFont(id) {
        document.documentElement.style.setProperty('--font-body', FONT_STACKS[id])
        set({ fontId: id })
      },
      async setLanguage(lang) {
        await changeLanguage(lang)
        set({ language: lang })
      },
      setVolumeBgm: (volumeBgm) => set({ volumeBgm }),
      setVolumeSfx: (volumeSfx) => set({ volumeSfx }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: 'whirl-prefs', version: 1 },
  ),
)
