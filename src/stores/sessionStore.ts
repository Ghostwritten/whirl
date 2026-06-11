import { create } from 'zustand'
import type { SpinPlan, SpinState } from '@/core/spin-engine'
import type { Sector } from '@/core/types'

export interface SpinResult {
  sector: Sector
  plan: SpinPlan
}

interface SessionState {
  spinState: SpinState
  currentAngle: number
  pendingResult: SpinResult | null
  setSpinState: (s: SpinState) => void
  setAngle: (a: number) => void
  setPendingResult: (r: SpinResult | null) => void
  reset: () => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  spinState: 'idle',
  currentAngle: 0,
  pendingResult: null,

  setSpinState: (spinState) => set({ spinState }),
  setAngle: (currentAngle) => set({ currentAngle }),
  setPendingResult: (pendingResult) => set({ pendingResult }),

  reset() {
    set({ spinState: 'idle', pendingResult: null })
  },
}))
