import api from './api'

export interface SlotResult {
  date: string
  slots: string[]
  serviceDurationMinutes: number
}

export async function fetchAvailableSlots(
  stylistId: string,
  serviceId: string,
  date: string, // YYYY-MM-DD
): Promise<SlotResult> {
  const { data } = await api.get('/slots', { params: { stylistId, serviceId, date } })
  return data
}
