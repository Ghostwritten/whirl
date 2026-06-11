import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generatePalette } from '@/core/palette'
import { MAX_LABEL_LENGTH, MAX_SECTORS, MIN_SECTORS } from '@/core/types'
import type { Sector, WheelConfig } from '@/core/types'

function newId(): string {
  return crypto.randomUUID()
}

function makeDefaultSectors(): Sector[] {
  const labels = ['Option A', 'Option B', 'Option C', 'Option D']
  const colors = generatePalette(labels.length)
  return labels.map((label, i) => ({
    id: newId(),
    label,
    color: colors[i] ?? '#888888',
    emoji: '',
    weight: 1,
  }))
}

export function makeDefaultWheel(): WheelConfig {
  const now = Date.now()
  return {
    id: newId(),
    title: 'My Wheel',
    sectors: makeDefaultSectors(),
    excludeMode: false,
    createdAt: now,
    updatedAt: now,
  }
}

interface WheelState {
  wheels: WheelConfig[]
  activeWheelId: string
  getActiveWheel: () => WheelConfig
  setActiveWheel: (id: string) => void
  createWheel: () => string
  duplicateWheel: (id: string) => string
  deleteWheel: (id: string) => void
  updateWheel: (id: string, patch: Partial<WheelConfig>) => void
  setTitle: (title: string) => void
  addSector: () => void
  updateSector: (sectorId: string, patch: Partial<Sector>) => void
  removeSector: (sectorId: string) => void
  moveSector: (sectorId: string, direction: 'up' | 'down') => void
  reorderSectors: (sectors: Sector[]) => void
  replaceActiveWheel: (config: WheelConfig) => void
  setExcludeMode: (enabled: boolean) => void
  excludeWinner: (sectorId: string) => void
}

export const useWheelStore = create<WheelState>()(
  persist(
    (set, get) => {
      const defaultWheel = makeDefaultWheel()

      const patchActive = (patcher: (w: WheelConfig) => Partial<WheelConfig>) =>
        set((state) => ({
          wheels: state.wheels.map((w) =>
            w.id === state.activeWheelId
              ? { ...w, ...patcher(w), updatedAt: Date.now() }
              : w,
          ),
        }))

      return {
        wheels: [defaultWheel],
        activeWheelId: defaultWheel.id,

        getActiveWheel() {
          const { wheels, activeWheelId } = get()
          return wheels.find((w) => w.id === activeWheelId) ?? wheels[0] ?? makeDefaultWheel()
        },

        setActiveWheel(id) {
          set({ activeWheelId: id })
        },

        createWheel() {
          const w = makeDefaultWheel()
          set((s) => ({ wheels: [...s.wheels, w], activeWheelId: w.id }))
          return w.id
        },

        duplicateWheel(id) {
          const src = get().wheels.find((w) => w.id === id)
          if (!src) return id
          const now = Date.now()
          const copy: WheelConfig = {
            ...src,
            id: newId(),
            title: `${src.title} (copy)`,
            sectors: src.sectors.map((s) => ({ ...s, id: newId() })),
            createdAt: now,
            updatedAt: now,
          }
          set((s) => ({ wheels: [...s.wheels, copy], activeWheelId: copy.id }))
          return copy.id
        },

        deleteWheel(id) {
          set((s) => {
            const wheels = s.wheels.filter((w) => w.id !== id)
            const fallback = wheels[0] ?? makeDefaultWheel()
            const final = wheels.length === 0 ? [fallback] : wheels
            return {
              wheels: final,
              activeWheelId:
                s.activeWheelId === id ? (final[0]?.id ?? fallback.id) : s.activeWheelId,
            }
          })
        },

        updateWheel(id, patch) {
          set((s) => ({
            wheels: s.wheels.map((w) =>
              w.id === id ? { ...w, ...patch, updatedAt: Date.now() } : w,
            ),
          }))
        },

        setTitle(title) {
          patchActive(() => ({ title: title.slice(0, 100) }))
        },

        addSector() {
          patchActive((w) => {
            if (w.sectors.length >= MAX_SECTORS) return {}
            const colors = generatePalette(w.sectors.length + 1)
            const newSector: Sector = {
              id: newId(),
              label: `Option ${w.sectors.length + 1}`,
              color: colors[w.sectors.length] ?? '#888888',
              emoji: '',
              weight: 1,
            }
            return { sectors: [...w.sectors, newSector] }
          })
        },

        updateSector(sectorId, patch) {
          patchActive((w) => ({
            sectors: w.sectors.map((s) =>
              s.id === sectorId
                ? {
                    ...s,
                    ...patch,
                    label: (patch.label ?? s.label).slice(0, MAX_LABEL_LENGTH),
                  }
                : s,
            ),
          }))
        },

        removeSector(sectorId) {
          patchActive((w) => {
            if (w.sectors.length <= MIN_SECTORS) return {}
            return { sectors: w.sectors.filter((s) => s.id !== sectorId) }
          })
        },

        moveSector(sectorId, direction) {
          patchActive((w) => {
            const idx = w.sectors.findIndex((s) => s.id === sectorId)
            if (idx < 0) return {}
            const next = direction === 'up' ? idx - 1 : idx + 1
            if (next < 0 || next >= w.sectors.length) return {}
            const sectors = [...w.sectors]
            ;[sectors[idx], sectors[next]] = [sectors[next]!, sectors[idx]!]
            return { sectors }
          })
        },

        reorderSectors(sectors) {
          patchActive(() => ({ sectors }))
        },

        replaceActiveWheel(config) {
          set((s) => ({
            wheels: s.wheels.map((w) =>
              w.id === s.activeWheelId
                ? { ...config, id: w.id, updatedAt: Date.now() }
                : w,
            ),
          }))
        },

        setExcludeMode(enabled) {
          patchActive(() => ({ excludeMode: enabled }))
        },

        excludeWinner(sectorId) {
          patchActive((w) => {
            if (w.sectors.length <= MIN_SECTORS) return {}
            return { sectors: w.sectors.filter((s) => s.id !== sectorId) }
          })
        },
      }
    },
    { name: 'whirl-wheels', version: 1 },
  ),
)
