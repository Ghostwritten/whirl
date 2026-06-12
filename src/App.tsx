import { useEffect, useRef, useState } from 'react'
import { WheelContainer } from '@/components/wheel/WheelContainer'
import { EditorPanel } from '@/components/editor/EditorPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { SharePanel } from '@/components/settings/SharePanel'
import { HistoryPanel } from '@/components/settings/HistoryPanel'
import { WheelManager } from '@/components/settings/WheelManager'
import { CanvasLayer } from '@/components/effects/CanvasLayer'
import { usePrefsStore, FONT_STACKS } from '@/stores/prefsStore'
import { useWheelStore } from '@/stores/wheelStore'
import { decodeShare } from '@/core/share-codec'
import { useTranslation } from 'react-i18next'
import { useSessionStore } from '@/stores/sessionStore'

export default function App() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { themeId, fontId, setTheme } = usePrefsStore()
  const replaceActiveWheel = useWheelStore((s) => s.replaceActiveWheel)
  const wheel = useWheelStore((s) => s.getActiveWheel())
  const spinState = useSessionStore((s) => s.spinState)
  const statusRef = useRef<HTMLDivElement>(null)

  // Apply theme/font on mount and changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId)
  }, [themeId])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-body', FONT_STACKS[fontId])
  }, [fontId])

  // Respect OS prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const store = usePrefsStore.getState()
    if (mq.matches && !store.reducedMotion) store.setReducedMotion(true)
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) usePrefsStore.getState().setReducedMotion(true)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Decode share URL on first load
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
      sectors: shared.sectors.map((s) => ({ ...s, id: crypto.randomUUID() })),
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
            padding: '10px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            backdropFilter: 'blur(14px)',
            flexShrink: 0,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: '-0.04em',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                lineHeight: 1,
              }}
            >
              WHIRL
            </h1>
            {/* Current wheel name chip */}
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '2px 10px',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={wheel.title}
            >
              {wheel.title}
            </span>
          </div>

          <nav
            style={{ display: 'flex', gap: 6, alignItems: 'center' }}
            aria-label="Toolbar"
          >
            <WheelManager />
            <HistoryPanel />
            <SharePanel />
            <SettingsPanel />
          </nav>
        </header>

        {/* Spinning status for screen readers */}
        <div
          ref={statusRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {spinState === 'accelerating'
            ? t('wheel.spinning')
            : spinState === 'idle'
              ? t('wheel.spin')
              : ''}
        </div>

        {/* Main layout */}
        <main
          style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
          id="main-content"
          tabIndex={-1}
        >
          <div
            className="app-layout"
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
                position: 'relative',
              }}
            >
              <WheelContainer />
            </div>

            {/* Editor sidebar */}
            <aside
              style={{
                width: sidebarOpen ? 320 : 0,
                flexShrink: 0,
                borderLeft: sidebarOpen ? '1px solid var(--border)' : 'none',
                background: 'var(--bg-panel)',
                padding: sidebarOpen ? '0 14px' : 0,
                overflowY: sidebarOpen ? 'auto' : 'hidden',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s ease, padding 0.3s ease',
                position: 'relative',
              }}
              aria-label={t('editor.title')}
            >
              {/* Collapse/expand toggle */}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: sidebarOpen ? -16 : -32,
                  zIndex: 50,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'left 0.3s ease',
                  boxShadow: 'var(--shadow)',
                }}
              >
                {sidebarOpen ? '▶' : '◀'}
              </button>
              {sidebarOpen && <EditorPanel />}
            </aside>
          </div>
        </main>
      </div>

      {/* Skip to main content link */}
      <a
        href="#main-content"
        style={{
          position: 'fixed',
          top: -60,
          left: 12,
          background: 'var(--accent)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 6,
          fontSize: 14,
          textDecoration: 'none',
          zIndex: 9999,
          transition: 'top 0.2s',
        }}
        onFocus={(e) => { e.currentTarget.style.top = '12px' }}
        onBlur={(e) => { e.currentTarget.style.top = '-60px' }}
      >
        Skip to main content
      </a>

      <style>{`
        @media (max-width: 640px) {
          .app-layout {
            flex-direction: column !important;
          }
          aside {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid var(--border);
            max-height: 44vh;
          }
        }
        @media (min-width: 1280px) {
          aside.sidebar-open { width: 360px !important; }
        }
      `}</style>
    </>
  )
}
