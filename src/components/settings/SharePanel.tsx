import { useRef, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { encodeShare } from '@/core/share-codec'
import { useWheelStore } from '@/stores/wheelStore'
import { usePrefsStore } from '@/stores/prefsStore'

export function SharePanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const wheel = useWheelStore((s) => s.getActiveWheel())
  const themeId = usePrefsStore((s) => s.themeId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function buildUrl() {
    const encoded = encodeShare({
      title: wheel.title,
      themeId,
      sectors: wheel.sectors.map((s) => ({
        label: s.label,
        color: s.color,
        emoji: s.emoji,
        weight: s.weight,
      })),
    })
    const url = new URL(location.href)
    url.hash = encoded
    return url.toString()
  }

  async function handleCopy() {
    const url = buildUrl()
    if ('share' in navigator && /Mobi/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ title: wheel.title, url })
        return
      } catch {
        // fall through to copy
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('share.title')}
        aria-expanded={open}
        style={iconBtnStyle}
      >
        🔗
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
              minWidth: 260,
              boxShadow: 'var(--shadow)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {t('share.title')}
            </h3>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
                wordBreak: 'break-all',
                maxHeight: 72,
                overflow: 'hidden',
                lineHeight: 1.4,
              }}
            >
              {buildUrl().slice(0, 120)}…
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? 'var(--accent)' : 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: copied ? '#fff' : 'var(--text-primary)',
                padding: '9px 16px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copied ? t('share.copied') : t('share.copy')}
            </button>
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
