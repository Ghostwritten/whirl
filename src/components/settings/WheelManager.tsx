import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useWheelStore } from '@/stores/wheelStore'
import type { WheelConfig } from '@/core/types'

export function WheelManager() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wheels = useWheelStore((s) => s.wheels)
  const activeWheelId = useWheelStore((s) => s.activeWheelId)
  const setActiveWheel = useWheelStore((s) => s.setActiveWheel)
  const createWheel = useWheelStore((s) => s.createWheel)
  const duplicateWheel = useWheelStore((s) => s.duplicateWheel)
  const deleteWheel = useWheelStore((s) => s.deleteWheel)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleExport(wheel: WheelConfig) {
    const blob = new Blob([JSON.stringify(wheel, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `whirl-${wheel.title.replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as WheelConfig
        if (!data.title || !Array.isArray(data.sectors)) return
        const now = Date.now()
        // Create a new wheel with the imported config
        const store = useWheelStore.getState()
        const id = store.createWheel()
        store.updateWheel(id, {
          ...data,
          id,
          createdAt: now,
          updatedAt: now,
          sectors: data.sectors.map((s) => ({
            ...s,
            id: crypto.randomUUID(),
          })),
        })
      } catch {
        // invalid JSON — silently ignore
      }
    }
    reader.readAsText(file)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('wheels.title')}
        aria-expanded={open}
        style={iconBtnStyle}
        title={t('wheels.title')}
      >
        🎡
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
              padding: '16px 14px',
              minWidth: 280,
              maxHeight: '70vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {t('wheels.title')}
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={smallBtnStyle}
                  title={t('wheels.import')}
                >
                  {t('wheels.import')}
                </button>
                <button
                  onClick={() => { createWheel(); setOpen(false) }}
                  style={{ ...smallBtnStyle, background: 'var(--accent)', color: '#fff', border: 'none' }}
                >
                  + {t('wheels.new')}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
                e.target.value = ''
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {wheels.map((w) => (
                <div
                  key={w.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background:
                      w.id === activeWheelId ? 'var(--accent)' + '22' : 'var(--bg-card)',
                    border: `1px solid ${w.id === activeWheelId ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 9,
                    padding: '7px 10px',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setActiveWheel(w.id); setOpen(false) }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: w.id === activeWheelId ? 700 : 400,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {w.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {w.sectors.length}
                  </span>

                  {/* Actions */}
                  <div
                    style={{ display: 'flex', gap: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleExport(w)}
                      title={t('wheels.export')}
                      style={tinyBtnStyle}
                    >
                      ⬇
                    </button>
                    <button
                      onClick={() => { duplicateWheel(w.id); setOpen(false) }}
                      title={t('wheels.duplicate')}
                      style={tinyBtnStyle}
                    >
                      ⧉
                    </button>
                    <button
                      onClick={() => deleteWheel(w.id)}
                      title={t('wheels.delete')}
                      style={{ ...tinyBtnStyle, color: '#ef4444' }}
                      disabled={wheels.length <= 1}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

const smallBtnStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-secondary)',
  padding: '4px 8px',
  fontSize: 11,
  cursor: 'pointer',
}

const tinyBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  padding: '2px 5px',
  fontSize: 13,
  cursor: 'pointer',
  borderRadius: 4,
}
