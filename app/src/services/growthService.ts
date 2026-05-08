import api from './api'

// ── Earnings ─────────────────────────────────────────────────────────────────

export interface MonthBucket {
  month: string
  monthNum: number
  revenueAgorot: number
  bookingCount: number
}

export interface MonthlyEarnings {
  year: number
  months: MonthBucket[]
  totalAgorot: number
}

export interface ServiceEarning {
  nameHe: string
  revenueAgorot: number
  count: number
}

export interface StylistEarning {
  name: string
  revenueAgorot: number
  count: number
}

export const getMonthlyEarnings = (year: number): Promise<MonthlyEarnings> =>
  api.get('/earnings/monthly', { params: { year } }).then((r) => r.data)

export const getEarningsByService = (from: string, to: string): Promise<ServiceEarning[]> =>
  api.get('/earnings/by-service', { params: { from, to } }).then((r) => r.data)

export const getEarningsByStylist = (from: string, to: string): Promise<StylistEarning[]> =>
  api.get('/earnings/by-stylist', { params: { from, to } }).then((r) => r.data)

// ── Promos ───────────────────────────────────────────────────────────────────

export interface PromoValidation {
  promoId: string
  code: string
  discountAgorot: number
  finalAgorot: number
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
}

export const validatePromo = (
  code: string,
  businessId: string,
  serviceId: string,
  originalAgorot: number,
): Promise<PromoValidation> =>
  api.post('/promos/validate', { code, businessId, serviceId, originalAgorot }).then((r) => r.data)

// ── Loyalty ──────────────────────────────────────────────────────────────────

export interface LoyaltyAccount {
  id: string
  points: number
  transactions: { type: string; points: number; note?: string; createdAt: string }[]
}

export interface RedemptionPreview {
  eligible: boolean
  discountAgorot: number
  balance: number
  toRedeem: number
}

export const getLoyaltyAccount = (businessId: string): Promise<LoyaltyAccount> =>
  api.get('/loyalty/account', { params: { businessId } }).then((r) => r.data)

export interface LoyaltyAccountSummary {
  id: string
  points: number
  business: { id: string; name: string }
}

export const getAllLoyaltyAccounts = (): Promise<LoyaltyAccountSummary[]> =>
  api.get('/loyalty/all').then((r) => r.data)

export const previewRedemption = (businessId: string, pointsToRedeem: number): Promise<RedemptionPreview> =>
  api.post('/loyalty/preview', { businessId, pointsToRedeem }).then((r) => r.data)

// ── Referrals ─────────────────────────────────────────────────────────────────

export interface ReferralInfo {
  referralCode: string
  referralsMade: {
    rewardedAt: string | null
    referred: { name: string; createdAt: string }
  }[]
}

export const getReferralInfo = (): Promise<ReferralInfo> =>
  api.get('/referrals/me').then((r) => r.data)
