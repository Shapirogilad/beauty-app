export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'CANCELLED_NO_REFUND'
  | 'COMPLETED'
  | 'NO_SHOW'

export interface BookingItem {
  id: string
  startAt: string
  endAt: string
  status: BookingStatus
  notes?: string
  serviceId: string
  stylistId: string
  service: {
    nameHe: string
    price: number  // agorot
    businessId: string
  }
  stylist: {
    name: string
    photo?: string
  }
  payment?: {
    status: string
  }
  review?: {
    id: string
  }
  pendingChangeRequest?: {
    id: string
    type: 'CANCEL_REFUND' | 'RESCHEDULE'
  }
}
