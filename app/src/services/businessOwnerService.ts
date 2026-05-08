import api from './api'
import { DashboardStats, ScheduleBooking, ManagedService, WorkingHoursEntry, DateException } from '../types/businessOwner'

// ─── Business Profile ──────────────────────────────────────────────────────

export interface BusinessProfile {
  id: string
  name: string
  description: string | null
  phone: string
  address: string
  category: string[]
  photos: string[]
  workPhotos: string[]
  owner: { name: string; email: string | null; phone: string }
}

export interface StylistProfile {
  id: string
  name: string
  photo: string | null
  bio: string | null
  specialties: string[]
  instagram: string | null
  isActive: boolean
}

export async function fetchBusinessProfile(): Promise<BusinessProfile> {
  const { data } = await api.get('/businesses/owner/business')
  return data
}

export async function updateBusinessProfile(payload: {
  name?: string; description?: string; phone?: string
  address?: string; city?: string; categories?: string[]
}): Promise<BusinessProfile> {
  const { data } = await api.patch('/businesses/owner/business', payload)
  return data
}

export async function updateOwnerInfo(payload: {
  name?: string; email?: string
}): Promise<void> {
  await api.patch('/businesses/owner/owner-info', payload)
}

export async function uploadBusinessPhoto(
  localUri: string,
  type: 'business' | 'work',
): Promise<{ photos: string[]; workPhotos: string[] }> {
  const formData = new FormData()
  const filename = localUri.split('/').pop() ?? 'photo.jpg'
  const match = /\.(\w+)$/.exec(filename)
  const mimeType = match ? `image/${match[1]}` : 'image/jpeg'
  formData.append('photo', { uri: localUri, name: filename, type: mimeType } as any)

  const token = (await import('../store/authStore')).useAuthStore.getState().token
  const baseUrl = api.defaults.baseURL ?? ''
  const res = await fetch(`${baseUrl}/businesses/owner/photos?type=${type}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function removeBusinessPhoto(
  type: 'business' | 'work',
  url: string,
): Promise<{ photos: string[]; workPhotos: string[] }> {
  const { data } = await api.delete('/businesses/owner/photos', { data: { type, url } })
  return data
}

// ─── Stylists ─────────────────────────────────────────────────────────────

export async function fetchOwnStylists(): Promise<StylistProfile[]> {
  const { data } = await api.get('/businesses/owner/stylists')
  return data
}

export async function createStylist(payload: {
  name: string; bio?: string; specialties?: string[]; instagram?: string
}): Promise<StylistProfile> {
  const { data } = await api.post('/businesses/owner/stylists', payload)
  return data
}

export async function updateStylist(
  stylistId: string,
  payload: { name?: string; bio?: string; specialties?: string[]; instagram?: string; isActive?: boolean },
): Promise<StylistProfile> {
  const { data } = await api.patch(`/businesses/owner/stylists/${stylistId}`, payload)
  return data
}

export interface StylistServiceItem {
  id: string
  nameHe: string
  price: number
  durationMinutes: number
  offered: boolean
}

export async function fetchStylistServices(stylistId: string): Promise<StylistServiceItem[]> {
  const { data } = await api.get(`/businesses/owner/stylists/${stylistId}/services`)
  return data
}

export async function setStylistServices(stylistId: string, serviceIds: string[]): Promise<StylistServiceItem[]> {
  const { data } = await api.put(`/businesses/owner/stylists/${stylistId}/services`, { serviceIds })
  return data
}

export async function uploadStylistPhoto(
  stylistId: string,
  localUri: string,
): Promise<StylistProfile> {
  const formData = new FormData()
  const filename = localUri.split('/').pop() ?? 'photo.jpg'
  const match = /\.(\w+)$/.exec(filename)
  const mimeType = match ? `image/${match[1]}` : 'image/jpeg'
  formData.append('photo', { uri: localUri, name: filename, type: mimeType } as any)

  const token = (await import('../store/authStore')).useAuthStore.getState().token
  const baseUrl = api.defaults.baseURL ?? ''
  const res = await fetch(`${baseUrl}/businesses/owner/stylists/${stylistId}/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Dashboard
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/businesses/owner/stats')
  return data
}

// Schedule
export async function fetchSchedule(date: string): Promise<ScheduleBooking[]> {
  const { data } = await api.get('/businesses/owner/schedule', { params: { date } })
  return data
}

// Services
export async function fetchOwnServices(): Promise<ManagedService[]> {
  const { data } = await api.get('/businesses/owner/services')
  return data
}

export async function createService(payload: Omit<ManagedService, 'id' | 'isActive'>): Promise<ManagedService> {
  const { data } = await api.post('/businesses/owner/services', payload)
  return data
}

export async function updateService(id: string, payload: Partial<ManagedService>): Promise<ManagedService> {
  const { data } = await api.patch(`/businesses/owner/services/${id}`, payload)
  return data
}

export async function toggleService(id: string, isActive: boolean): Promise<void> {
  await api.patch(`/businesses/owner/services/${id}`, { isActive })
}

// Date exceptions
export async function fetchDateExceptions(): Promise<DateException[]> {
  const { data } = await api.get('/businesses/owner/date-exceptions')
  return data
}

export async function upsertDateException(payload: {
  date: string; isClosed: boolean; openTime?: string; closeTime?: string
  breaks?: { start: string; end: string }[]; note?: string
}): Promise<DateException> {
  const { data } = await api.put('/businesses/owner/date-exceptions', payload)
  return data
}

export async function deleteDateException(date: string): Promise<void> {
  await api.delete(`/businesses/owner/date-exceptions/${date}`)
}

// Working hours
export async function fetchWorkingHours(): Promise<WorkingHoursEntry[]> {
  const { data } = await api.get('/businesses/owner/working-hours')
  return data
}

export async function saveWorkingHours(hours: WorkingHoursEntry[]): Promise<void> {
  const payload = hours.map(({ dayOfWeek, openTime, closeTime, isClosed, breaks }) => ({
    dayOfWeek, openTime, closeTime, isClosed, breaks,
  }))
  await api.put('/businesses/owner/working-hours', { hours: payload })
}

// Waitlist
export async function fetchBusinessWaitlist(date: string): Promise<{
  id: string
  client: { id: string; name: string; phone: string }
  service: { id: string; nameHe: string }
}[]> {
  const { data } = await api.get('/businesses/owner/waitlist', { params: { date } })
  return data
}

// Booking management (owner actions)
export async function confirmBooking(bookingId: string): Promise<void> {
  await api.patch(`/bookings/${bookingId}/confirm`)
}

export async function cancelBookingByOwner(bookingId: string): Promise<void> {
  await api.patch(`/bookings/${bookingId}/cancel-by-owner`)
}

export async function issueRefundByOwner(bookingId: string): Promise<void> {
  await api.post('/payments/refund-by-owner', { bookingId })
}

export async function markNoShow(bookingId: string): Promise<void> {
  await api.patch(`/bookings/${bookingId}/no-show`)
}

