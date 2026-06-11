import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SpinRecord } from '@/core/types'

interface HistoryState {
  records: SpinRecord[]
  addRecord: (r: Omit<SpinRecord, 'id'>) => void
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],
      addRecord(r) {
        set((s) => ({
          records: [{ ...r, id: crypto.randomUUID() }, ...s.records].slice(0, 500),
        }))
      },
      clearHistory() {
        set({ records: [] })
      },
    }),
    { name: 'whirl-history', version: 1 },
  ),
)
