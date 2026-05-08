import api from './api'
import { BusinessDetail, BusinessSummary, PaginatedResponse } from '../types/business'

interface QueryParams {
  category?: string   // Hebrew category string as stored in DB
  lat?: number
  lng?: number
  search?: string
  sort?: 'distance' | 'rating'
  page?: number
  pageSize?: number
}

export async function fetchBusinesses(
  params: QueryParams,
): Promise<PaginatedResponse<BusinessSummary>> {
  const { data } = await api.get('/businesses', { params })
  return data
}

export async function fetchBusinessById(id: string): Promise<BusinessDetail> {
  const { data } = await api.get(`/businesses/${id}`)
  return data
}

export async function fetchStylistsForService(
  businessId: string,
  serviceId: string,
): Promise<BusinessDetail['stylists']> {
  const { data } = await api.get(`/businesses/${businessId}/stylists-for-service/${serviceId}`)
  return data
}
