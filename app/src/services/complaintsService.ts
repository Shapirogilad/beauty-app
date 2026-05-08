import api from './api'

export const COMPLAINT_REASONS = [
  'שירות גרוע',
  'התנהגות לא הולמת',
  'מחיר שגוי / הטעייה',
  'ביטול ללא הודעה',
  'תוכן לא הולם',
  'אחר',
] as const

export type ComplaintReason = typeof COMPLAINT_REASONS[number]

export interface Complaint {
  id: string
  businessId: string
  clientId: string
  reason: string
  description: string | null
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED'
  createdAt: string
  business: { id: string; name: string }
  client: { id: string; name: string; phone: string }
}

export const submitComplaint = (payload: {
  businessId: string
  reason: string
  description?: string
}): Promise<void> =>
  api.post('/complaints', payload).then(() => {})

export const fetchAdminComplaints = (status?: string): Promise<Complaint[]> =>
  api.get('/admin/complaints', { params: status ? { status } : undefined }).then((r) => r.data)

export const updateComplaintStatus = (id: string, status: string): Promise<Complaint> =>
  api.patch(`/admin/complaints/${id}/status`, { status }).then((r) => r.data)
