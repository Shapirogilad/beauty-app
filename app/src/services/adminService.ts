import api from './api'

export interface AdminStats {
  totalClients: number
  totalBusinesses: number
  totalBookings: number
  bookingsToday: number
  totalRevenueAgorot: number
  newClientsThisWeek: number
}

export interface AdminClient {
  id: string
  name: string
  phone: string
  email?: string
  city?: string
  createdAt: string
  bookingCount: number
  totalSpentAgorot: number
}

export interface AdminClientDetail extends AdminClient {
  photo?: string
  bookings: {
    id: string
    startAt: string
    status: string
    service: { nameHe: string; price: number }
    stylist: { name: string; business: { name: string } }
  }[]
  loyaltyAccounts: {
    points: number
    business: { id: string; name: string }
  }[]
  totalSpentAgorot: number
}

export interface AdminBusiness {
  id: string
  name: string
  address: string
  category: string[]
  createdAt: string
  owner: { name: string; phone: string }
  bookingCount: number
  revenueAgorot: number
}

export interface AdminBusinessDetail extends AdminBusiness {
  owner: { name: string; phone: string; email?: string }
  stylists: { id: string; name: string; _count: { bookings: number } }[]
  services: { id: string; nameHe: string; price: number; durationMinutes: number }[]
  recentBookings: {
    id: string
    startAt: string
    status: string
    client: { name: string; phone: string }
    service: { nameHe: string; price: number }
  }[]
}

export interface AdminBooking {
  id: string
  startAt: string
  status: string
  createdAt: string
  client: { name: string; phone: string }
  service: { nameHe: string; price: number }
  stylist: { name: string; business: { name: string } }
}

export const fetchAdminStats = (): Promise<AdminStats> =>
  api.get('/admin/stats').then((r) => r.data)

export const fetchAdminClients = (search?: string): Promise<AdminClient[]> =>
  api.get('/admin/clients', { params: search ? { search } : undefined }).then((r) => r.data)

export const fetchAdminClient = (clientId: string): Promise<AdminClientDetail> =>
  api.get(`/admin/clients/${clientId}`).then((r) => r.data)

export const fetchAdminBusinesses = (search?: string): Promise<AdminBusiness[]> =>
  api.get('/admin/businesses', { params: search ? { search } : undefined }).then((r) => r.data)

export const fetchAdminBusiness = (businessId: string): Promise<AdminBusinessDetail> =>
  api.get(`/admin/businesses/${businessId}`).then((r) => r.data)

export const fetchAdminBookings = (limit = 20): Promise<AdminBooking[]> =>
  api.get('/admin/bookings', { params: { limit } }).then((r) => r.data)

export const adminCreditLoyalty = (
  clientId: string,
  businessId: string,
  points: number,
  note?: string,
): Promise<{ success: boolean; pointsGranted: number }> =>
  api.post('/admin/loyalty/credit', { clientId, businessId, points, note }).then((r) => r.data)

export const adminDeleteUser = (userId: string): Promise<{ success: boolean }> =>
  api.delete(`/admin/users/${userId}`).then((r) => r.data)

export interface AdminFinance {
  revenueToday: number
  revenueThisWeek: number
  revenueThisMonth: number
  revenueTotal: number
  avgBookingValue: number
  topBusinesses: { id: string; name: string; revenueAgorot: number; bookingCount: number }[]
  recentPayments: {
    id: string; amountAgorot: number; status: string; createdAt: string; cardLast4?: string
    booking: {
      client: { name: string }
      service: { nameHe: string }
      stylist: { business: { name: string } }
    }
  }[]
  paymentStatusBreakdown: Record<string, number>
}

export const fetchAdminFinance = (): Promise<AdminFinance> =>
  api.get('/admin/finance').then((r) => r.data)

export interface PendingBusiness {
  id: string
  name: string
  address: string
  category: string[]
  phone: string
  createdAt: string
  owner: { id: string; name: string; phone: string; email?: string }
}

export const fetchPendingBusinesses = (): Promise<PendingBusiness[]> =>
  api.get('/admin/businesses/pending').then((r) => r.data)

export const approveBusiness = (id: string): Promise<{ success: boolean }> =>
  api.patch(`/admin/businesses/${id}/approve`).then((r) => r.data)

export const rejectBusiness = (id: string): Promise<{ success: boolean }> =>
  api.patch(`/admin/businesses/${id}/reject`).then((r) => r.data)
