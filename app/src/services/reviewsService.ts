import api from './api'

export async function submitReview(bookingId: string, rating: number, text?: string) {
  const { data } = await api.post('/reviews', { bookingId, rating, text })
  return data
}
