/** A single wheel sector (slice). Angular size is always equal across
 * sectors — `weight` only affects selection probability. */
export interface Sector {
  id: string
  label: string
  color: string
  emoji: string
  weight: number
}

export interface WheelConfig {
  id: string
  title: string
  sectors: Sector[]
  /** When true, the winning sector is removed after each spin. */
  excludeMode: boolean
  createdAt: number
  updatedAt: number
}

export interface SpinRecord {
  id: string
  wheelId: string
  wheelTitle: string
  sectorLabel: string
  sectorColor: string
  timestamp: number
}

export const MIN_SECTORS = 2
export const MAX_SECTORS = 24
export const MAX_LABEL_LENGTH = 20
export const MIN_WEIGHT = 0
export const MAX_WEIGHT = 10
