import { useTranslation } from 'react-i18next'
import { useWheelStore } from '@/stores/wheelStore'
import { MAX_WEIGHT, MIN_WEIGHT } from '@/core/types'
import type { Sector } from '@/core/types'
import { AvatarPicker } from './AvatarPicker'

interface Props {
  sector: Sector
  index: number
  total: number
  disabled: boolean
}

export function SectorRow({ sector, index, total, disabled }: Props) {
  const { t } = useTranslation()
  const updateSector = useWheelStore((s) => s.updateSector)
  const removeSector = useWheelStore((s) => s.removeSector)
  const moveSector = useWheelStore((s) => s.moveSector)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 32px 1fr 32px 80px 28px',
        gap: 6,
        alignItems: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '6px 8px',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* Reorder */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <button
          onClick={() => moveSector(sector.id, 'up')}
          disabled={disabled || index === 0}
          aria-label={t('editor.sector_move_up')}
          style={iconBtnStyle}
        >
          ▲
        </button>
        <button
          onClick={() => moveSector(sector.id, 'down')}
          disabled={disabled || index === total - 1}
          aria-label={t('editor.sector_move_down')}
          style={iconBtnStyle}
        >
          ▼
        </button>
      </div>

      {/* Color swatch */}
      <div style={{ position: 'relative' }}>
        <input
          type="color"
          value={sector.color}
          onChange={(e) => updateSector(sector.id, { color: e.target.value })}
          disabled={disabled}
          aria-label={t('editor.sector_color')}
          title={t('editor.sector_color')}
          style={{
            width: 28,
            height: 28,
            padding: 2,
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'none',
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Label */}
      <input
        type="text"
        value={sector.label}
        maxLength={20}
        onChange={(e) => updateSector(sector.id, { label: e.target.value })}
        disabled={disabled}
        placeholder={t('editor.sector_label')}
        aria-label={t('editor.sector_label')}
        style={inputStyle}
      />

      {/* Emoji / Avatar Picker */}
      <AvatarPicker
        value={sector.emoji}
        onChange={(emoji) => updateSector(sector.id, { emoji })}
        disabled={disabled}
      />

      {/* Weight slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <input
          type="range"
          min={MIN_WEIGHT}
          max={MAX_WEIGHT}
          step={0.5}
          value={sector.weight}
          onChange={(e) => updateSector(sector.id, { weight: parseFloat(e.target.value) })}
          disabled={disabled}
          aria-label={t('editor.sector_weight')}
          style={{ width: '100%', accentColor: sector.color }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
          {sector.weight}×
        </span>
      </div>

      {/* Delete */}
      <button
        onClick={() => removeSector(sector.id)}
        disabled={disabled || total <= 2}
        aria-label={t('editor.sector_delete')}
        title={t('editor.sector_delete')}
        style={{ ...iconBtnStyle, color: 'var(--text-muted)', fontSize: 14 }}
      >
        ✕
      </button>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: 9,
  padding: '1px 3px',
  borderRadius: 3,
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  padding: '4px 7px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
}
