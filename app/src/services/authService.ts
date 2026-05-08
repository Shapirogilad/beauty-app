import api from './api'

export interface RegisterPayload {
  name: string
  phone: string
  email: string
  dateOfBirth: string   // ISO e.g. "1995-03-14"
  sex: 'FEMALE' | 'MALE' | 'OTHER'
  city: string
  address?: string
}

export interface RegisterBusinessPayload {
  name: string
  phone: string
  email: string
  businessName: string
  businessPhone: string
  address: string
  city: string
  categories: string[]
  workingHours?: Array<{
    dayOfWeek: number
    openTime: string
    closeTime: string
    isClosed: boolean
    breaks?: { start: string; end: string }[]
  }>
}

export async function register(payload: RegisterPayload): Promise<{ user: any; token: string }> {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function registerBusiness(payload: RegisterBusinessPayload): Promise<{ user: any; token: string }> {
  const { data } = await api.post('/auth/register-business', payload)
  return data
}

export async function login(phone: string): Promise<{ user: any; token: string }> {
  const { data } = await api.post('/auth/login', { phone })
  return data
}

export async function sendOtp(phone: string): Promise<void> {
  await api.post('/auth/send-otp', { phone })
}

export async function verifyOtp(phone: string, code: string): Promise<{ user: any; token: string; isNewUser: boolean }> {
  const { data } = await api.post('/auth/verify-otp', { phone, code })
  return data
}

export async function fetchMe(): Promise<{ walletBalance: number; [key: string]: any }> {
  const { data } = await api.get('/auth/me')
  return data
}
