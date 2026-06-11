import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useHistoryStore } from '@/stores/historyStore'

export function HistoryPanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const records = useHistoryStore((s) => s.records)
  const clearHistory = useHistoryStore((s) => s.clearHistory)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Compute distribution for current wheel
  const distribution: Record<string, number> = {}
  for (const r of records) {
    distribution[r.sectorLabel] = (distribution[r.sectorLabel] ?? 0) + 1
  }
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1])
  const max = sorted[0]?.[1] ?? 1

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('history.title')}
        aria-expanded={open}
        style={iconBtnStyle}
      >
        📊
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
              maxHeight: '70vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {t('history.title')}
              </h3>
              {records.length > 0 && (
                <button
                  onClick={clearHistory}
                  style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t('history.clear')}
                </button>
              )}
            </div>

            {records.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                {t('history.empty')}
              </p>
            ) : (
              <>
                {sorted.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {t('history.stats')}
                    </div>
                    {sorted.map(([label, count]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {label}
                        </span>
                        <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(count / max) * 100}%`,
                              background: 'var(--accent)',
                              borderRadius: 3,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28, textAlign: 'right' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Recent
                  </div>
                  {records.slice(0, 20).map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        padding: '5px 8px',
                        background: 'var(--bg-card)',
                        borderRadius: 7,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.sectorColor, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-primary)', fontWeight: 600 }}>{r.sectorLabel}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
