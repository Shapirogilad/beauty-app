import { create } from 'zustand'
import * as Location from 'expo-location'
import { Alert } from 'react-native'

interface LocationState {
  lat: number | null
  lng: number | null
  label: string
  isCustom: boolean
  loading: boolean
  requestGps: () => Promise<void>
  setCustom: (address: string, lat: number, lng: number) => void
  resetToGps: () => void
}

export const useLocationStore = create<LocationState>()((set, get) => ({
  lat: null,
  lng: null,
  label: 'מיקום נוכחי',
  isCustom: false,
  loading: false,

  requestGps: async () => {
    set({ loading: true })
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'הרשאת מיקום נדחתה',
          'כדי לראות עסקים קרובים אלייך, יש לאפשר גישה למיקום בהגדרות הטלפון.',
        )
        set({ loading: false })
        return
      }

      // 1. Use last known position immediately (instant — no GPS warm-up)
      const last = await Location.getLastKnownPositionAsync()
      if (last) {
        set({
          lat: last.coords.latitude,
          lng: last.coords.longitude,
          label: 'מיקום נוכחי',
          isCustom: false,
          loading: false,
        })
      }

      // 2. Refresh in background with low-accuracy (WiFi/cell towers, ~1-2s)
      //    — silently updates coordinates without blocking the UI
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
        .then((pos) => {
          if (!get().isCustom) {
            set({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              label: 'מיקום נוכחי',
              isCustom: false,
              loading: false,
            })
          }
        })
        .catch(() => {
          set({ loading: false })
        })

      // If no last known position, keep loading until fresh position arrives
      if (!last) return

    } catch {
      set({ loading: false })
    }
  },

  setCustom: (address, lat, lng) => {
    set({ lat, lng, label: address, isCustom: true })
  },

  resetToGps: () => {
    set({ label: 'מיקום נוכחי', isCustom: false })
    get().requestGps()
  },
}))
