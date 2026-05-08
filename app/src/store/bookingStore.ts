import { create } from 'zustand'

interface BookingDraft {
  businessId: string | null
  serviceId: string | null
  stylistId: string | null
  slotStart: string | null
  slotEnd: string | null
}

interface BookingState {
  draft: BookingDraft
  setDraftField: <K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) => void
  resetDraft: () => void
}

const emptyDraft: BookingDraft = {
  businessId: null,
  serviceId: null,
  stylistId: null,
  slotStart: null,
  slotEnd: null,
}

export const useBookingStore = create<BookingState>()((set) => ({
  draft: emptyDraft,
  setDraftField: (key, value) =>
    set((state) => ({ draft: { ...state.draft, [key]: value } })),
  resetDraft: () => set({ draft: emptyDraft }),
}))
