import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SectorRow } from './SectorRow'
import { TEMPLATES } from './TEMPLATES'
import { useWheelStore } from '@/stores/wheelStore'
import { useSessionStore } from '@/stores/sessionStore'
import { MAX_SECTORS } from '@/core/types'

export function EditorPanel() {
  const { t } = useTranslation()
  const wheel = useWheelStore((s) => s.getActiveWheel())
  const setTitle = useWheelStore((s) => s.setTitle)
  const addSector = useWheelStore((s) => s.addSector)
  const setExcludeMode = useWheelStore((s) => s.setExcludeMode)
  const replaceActiveWheel = useWheelStore((s) => s.replaceActiveWheel)
  const spinState = useSessionStore((s) => s.spinState)
  const disabled = spinState !== 'idle'

  const [showTemplates, setShowTemplates] = useState(false)

  function loadTemplate(idx: number) {
    const tpl = TEMPLATES[idx]
    if (!tpl) return
    const now = Date.now()
    replaceActiveWheel({
      ...tpl,
      id: '',
      sectors: tpl.sectors.map((s) => ({ ...s, id: crypto.randomUUID() })),
      createdAt: now,
      updatedAt: now,
    })
    setShowTemplates(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '16px 0',
        overflowY: 'auto',
        flex: 1,
      }}
    >
      {/* Title */}
      <div>
        <label
          htmlFor="wheel-title"
          style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          {t('editor.title')}
        </label>
        <input
          id="wheel-title"
          type="text"
          value={wheel.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('editor.title_placeholder')}
          disabled={disabled}
          style={{
            width: '100%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            padding: '8px 12px',
            fontSize: 15,
            fontWeight: 600,
          }}
        />
      </div>

      {/* Templates */}
      <div>
        <button
          onClick={() => setShowTemplates((v) => !v)}
          disabled={disabled}
          style={outlineBtnStyle}
        >
          📋 {t('editor.templates')}
        </button>
        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                {TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => loadTemplate(i)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 7,
                      color: 'var(--text-primary)',
                      padding: '7px 12px',
                      textAlign: 'left',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sectors */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Options ({wheel.sectors.length}/{MAX_SECTORS})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {wheel.sectors.map((sector, i) => (
            <SectorRow
              key={sector.id}
              sector={sector}
              index={i}
              total={wheel.sectors.length}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Add sector */}
      {wheel.sectors.length < MAX_SECTORS && (
        <button
          onClick={addSector}
          disabled={disabled}
          style={outlineBtnStyle}
        >
          + {t('editor.add_sector')}
        </button>
      )}

      {/* Exclude mode */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={wheel.excludeMode}
          onChange={(e) => setExcludeMode(e.target.checked)}
          disabled={disabled}
          style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
        />
        {t('editor.exclude_mode')}
      </label>
    </div>
  )
}

const outlineBtnStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-secondary)',
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
}
