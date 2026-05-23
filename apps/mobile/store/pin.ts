import { create } from 'zustand'
import type { PinWithWashroom } from '@water-potty/shared'

interface PinState {
  pins:      PinWithWashroom[]
  isLoading: boolean

  setPins:    (pins: PinWithWashroom[]) => void
  addPin:     (pin: PinWithWashroom) => void
  removePin:  (washroomId: string) => void
  setLoading: (loading: boolean) => void
  isPinned:   (washroomId: string) => boolean
}

export const usePinStore = create<PinState>((set, get) => ({
  pins:      [],
  isLoading: false,

  setPins: (pins) =>
    set({ pins }),

  addPin: (pin) =>
    set((state) => ({ pins: [...state.pins, pin] })),

  removePin: (washroomId) =>
    set((state) => ({
      pins: state.pins.filter((p) => p.washroom_id !== washroomId),
    })),

  setLoading: (isLoading) =>
    set({ isLoading }),

  isPinned: (washroomId) =>
    get().pins.some((p) => p.washroom_id === washroomId),
}))
