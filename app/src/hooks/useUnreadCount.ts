import { useState, useEffect, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getUnreadCount } from '../services/messagesService'
import { useAuthStore } from '../store/authStore'

export function useUnreadCount() {
  const token = useAuthStore((s) => s.token)
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!token) return
    getUnreadCount().then((r) => setCount(r.count)).catch(() => {})
  }, [token])

  // Refresh when the tab gains focus
  useFocusEffect(useCallback(() => { refresh() }, [refresh]))

  // Refresh when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh()
    })
    return () => sub.remove()
  }, [refresh])

  // Poll every 30 seconds
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
  }, [refresh])

  return count
}
