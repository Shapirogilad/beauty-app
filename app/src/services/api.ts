import axios from 'axios'
import Constants from 'expo-constants'
import { useAuthStore } from '../store/authStore'

// Derive the server host from Expo's dev server so the IP is always current.
function getBaseUrl(): string {
  const debuggerHost =
    (Constants as any).expoGoConfig?.debuggerHost ??   // Expo Go SDK 49+
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ?? // SDK 46-48
    (Constants as any).manifest?.debuggerHost          // older SDKs

  if (debuggerHost) {
    const host = (debuggerHost as string).split(':')[0]
    return `http://${host}:3000/api/v1`
  }
  return Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:3000/api/v1'
}

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear auth on 401 if the user was already logged in (session expiry)
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().clearAuth()
    }
    return Promise.reject(error)
  },
)

/** Base URL for static uploads (same host as API, no /api/v1 prefix) */
export function getUploadsBaseUrl(): string {
  const base = getBaseUrl()
  return base.replace('/api/v1', '')
}

export default api
