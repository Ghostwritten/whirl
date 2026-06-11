import { useEffect } from 'react'
import { WheelContainer } from '@/components/wheel/WheelContainer'
import { EditorPanel } from '@/components/editor/EditorPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { SharePanel } from '@/components/settings/SharePanel'
import { HistoryPanel } from '@/components/settings/HistoryPanel'
import { CanvasLayer } from '@/components/effects/CanvasLayer'
import { usePrefsStore } from '@/stores/prefsStore'
import { useWheelStore } from '@/stores/wheelStore'
import { decodeShare } from '@/core/share-codec'
import { FONT_STACKS } from '@/stores/prefsStore'
import { useTranslation } from 'react-i18next'

export default function App() {
  const { t } = useTranslation()
  const { themeId, fontId, setTheme } = usePrefsStore()
  const replaceActiveWheel = useWheelStore((s) => s.replaceActiveWheel)

  // Apply theme and font on mount / changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId)
  }, [themeId])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-body', FONT_STACKS[fontId])
  }, [fontId])

  // Parse share URL on first load
  useEffect(() => {
    const hash = location.hash.slice(1)
    if (!hash) return
    const shared = decodeShare(hash)
    if (!shared) return
    const now = Date.now()
    replaceActiveWheel({
      id: '',
      title: shared.title,
      excludeMode: false,
      sectors: shared.sectors.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
      })),
      createdAt: now,
      updatedAt: now,
    })
    if (shared.themeId) {
      setTheme(shared.themeId as Parameters<typeof setTheme>[0])
    }
    history.replaceState(null, '', location.pathname)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <CanvasLayer />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: 0,
            }}
          >
            WHIRL
          </h1>
          <nav
            style={{ display: 'flex', gap: 8, alignItems: 'center' }}
            aria-label="Toolbar"
          >
            <HistoryPanel />
            <SharePanel />
            <SettingsPanel />
          </nav>
        </header>

        {/* Main content */}
        <main
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Desktop: side-by-side; Mobile: stacked */}
          <div
            style={{
              display: 'flex',
              flex: 1,
              flexDirection: 'row',
              overflow: 'hidden',
            }}
          >
            {/* Wheel area */}
            <div
              style={{
                flex: '1 1 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                minWidth: 0,
              }}
            >
              <WheelContainer />
            </div>

            {/* Editor sidebar */}
            <aside
              style={{
                width: 320,
                flexShrink: 0,
                borderLeft: '1px solid var(--border)',
                background: 'var(--bg-panel)',
                padding: '0 16px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
              aria-label={t('editor.title')}
            >
              <EditorPanel />
            </aside>
          </div>
        </main>
      </div>

      <style>{mobileStyles}</style>
    </>
  )
}

const mobileStyles = `
@media (max-width: 640px) {
  main > div {
    flex-direction: column !important;
  }
  aside {
    width: 100% !important;
    border-left: none !important;
    border-top: 1px solid var(--border);
    max-height: 45vh;
  }
}
`
