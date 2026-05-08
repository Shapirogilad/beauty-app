import api from './api'

export async function joinWaitlist(serviceId: string, dateFrom: string, dateTo: string): Promise<void> {
  await api.post('/notifications/waitlist', { serviceId, dateFrom, dateTo })
}

export async function getMyWaitlist() {
  const { data } = await api.get('/notifications/waitlist')
  return data
}

export async function leaveWaitlist(entryId: string): Promise<void> {
  await api.delete(`/notifications/waitlist/${entryId}`)
}
