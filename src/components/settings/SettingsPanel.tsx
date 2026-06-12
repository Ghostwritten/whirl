import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  FONT_STACKS,
  usePrefsStore,
  type FontId,
  type ThemeId,
} from '@/stores/prefsStore'
import { SUPPORTED_LANGS, type SupportedLang } from '@/i18n'

const THEMES: { id: ThemeId; labelKey: string }[] = [
  { id: 'neon', labelKey: 'settings.theme_neon' },
  { id: 'candy', labelKey: 'settings.theme_candy' },
  { id: 'dark', labelKey: 'settings.theme_dark' },
  { id: 'minimal', labelKey: 'settings.theme_minimal' },
]

const FONTS: { id: FontId; labelKey: string }[] = [
  { id: 'inter', labelKey: 'settings.font_inter' },
  { id: 'serif', labelKey: 'settings.font_serif' },
  { id: 'mono', labelKey: 'settings.font_mono' },
]

const LANG_LABELS: Record<SupportedLang, string> = {
  'en-US': 'English',
  'zh-CN': '中文',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
}

export function SettingsPanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const {
    themeId, setTheme,
    fontId, setFont,
    language, setLanguage,
    volumeBgm, setVolumeBgm,
    volumeSfx, setVolumeSfx,
    reducedMotion, setReducedMotion,
  } = usePrefsStore()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('settings.title')}
        aria-expanded={open}
        style={iconBtnStyle}
      >
        ⚙️
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 44,
              right: 0,
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '16px 18px',
              minWidth: 280,
              boxShadow: 'var(--shadow)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {t('settings.title')}
            </h3>

            <Section label={t('settings.theme')}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {THEMES.map((th) => (
                  <Chip
                    key={th.id}
                    active={themeId === th.id}
                    onClick={() => setTheme(th.id)}
                  >
                    {t(th.labelKey)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section label={t('settings.language')}>
              <div style={{ display: 'flex', gap: 6 }}>
                {SUPPORTED_LANGS.map((lang) => (
                  <Chip
                    key={lang}
                    active={language === lang}
                    onClick={() => setLanguage(lang)}
                  >
                    {LANG_LABELS[lang]}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section label={t('settings.font')}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {FONTS.map((f) => (
                  <Chip
                    key={f.id}
                    active={fontId === f.id}
                    onClick={() => setFont(f.id)}
                    style={{ fontFamily: FONT_STACKS[f.id] }}
                  >
                    {t(f.labelKey)}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section label={t('settings.volume_bgm')}>
              <VolumeSlider value={volumeBgm} onChange={setVolumeBgm} label={t('settings.volume_bgm')} />
            </Section>

            <Section label={t('settings.volume_sfx')}>
              <VolumeSlider value={volumeSfx} onChange={setVolumeSfx} label={t('settings.volume_sfx')} />
            </Section>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              {t('settings.reduced_motion')}
            </label>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children, style }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--accent)' : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        cursor: 'pointer',
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function VolumeSlider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        style={{ flex: 1, accentColor: 'var(--accent)' }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text-secondary)',
  padding: '6px 10px',
  fontSize: 18,
  cursor: 'pointer',
}
