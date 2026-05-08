import api from './api'

export interface BookingPayload {
  stylistId: string
  serviceId: string
  slotStart: string
  promoId?: string
  loyaltyPointsToRedeem?: number
}

export interface ChargePayload {
  bookingId: string
  ccno: string
  expdate: string
  cvv: string
  saveCard: boolean
  useWallet?: boolean
}

export async function createBooking(payload: BookingPayload) {
  const { data } = await api.post('/bookings', payload)
  return data
}

export async function chargeCard(payload: ChargePayload) {
  const { data } = await api.post('/payments/charge', payload)
  return data
}

export async function chargeWithSavedCard(bookingId: string, savedCardId: string, useWallet = false) {
  const { data } = await api.post('/payments/charge-token', { bookingId, savedCardId, useWallet })
  return data
}

export async function payWithWalletOnly(bookingId: string) {
  const { data } = await api.post('/payments/pay-wallet-only', { bookingId })
  return data
}

export async function fetchServicePrice(serviceId: string) {
  const { data } = await api.get(`/businesses/service/${serviceId}`)
  return data as { id: string; nameHe: string; price: number; durationMinutes: number }
}

export async function fetchSavedCards() {
  const { data } = await api.get('/payments/saved-cards')
  return data
}

export async function addCardToWallet(payload: { ccno: string; expdate: string; cvv: string }) {
  const { data } = await api.post('/payments/add-card', payload)
  return data
}

export async function deleteCardFromWallet(cardId: string) {
  await api.delete(`/payments/saved-cards/${cardId}`)
}

export async function fetchMyBookings(status: 'upcoming' | 'past') {
  const { data } = await api.get('/bookings/mine', { params: { status } })
  return data
}

export async function cancelBooking(bookingId: string) {
  const { data } = await api.patch(`/bookings/${bookingId}/cancel`)
  return data
}

export async function requestCancelWithRefund(bookingId: string, note?: string) {
  const { data } = await api.post(`/bookings/${bookingId}/change-request`, {
    type: 'CANCEL_REFUND', note,
  })
  return data
}

export async function requestReschedule(bookingId: string, proposedStart: string, note?: string) {
  const { data } = await api.post(`/bookings/${bookingId}/change-request`, {
    type: 'RESCHEDULE', proposedStart, note,
  })
  return data
}

export async function fetchPendingChangeRequests() {
  const { data } = await api.get('/bookings/change-requests')
  return data
}

export async function approveChangeRequest(requestId: string) {
  const { data } = await api.patch(`/bookings/change-requests/${requestId}/approve`)
  return data
}

export async function declineChangeRequest(requestId: string) {
  const { data } = await api.patch(`/bookings/change-requests/${requestId}/decline`)
  return data
}
