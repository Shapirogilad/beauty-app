export type RootStackParamList = {
  // Auth
  Welcome: undefined
  Register: undefined
  BusinessRegister: undefined
  Login: undefined
  OtpVerify: { phone: string }
  ProfileSetup: { phone: string }
  BusinessPending: undefined

  // Client — Main tabs
  ClientTabs: undefined

  // Client — Stack
  Home: undefined
  Search: { category?: string }
  BusinessProfile: { businessId: string }
  ServiceSelect: { businessId: string }
  StylistSelect: { businessId: string; serviceId: string }
  DateTimeSelect: { stylistId: string; serviceId: string }
  BookingConfirm: { stylistId: string; serviceId: string; slotStart: string }
  BookingSuccess: {
    bookingId: string
    startAt: string
    endAt: string
    businessName?: string
    businessAddress?: string
    serviceName?: string
    stylistName?: string
  }
  Review: { bookingId: string; serviceName: string }
  RescheduleRequest: { bookingId: string; stylistId: string; serviceId: string; serviceName: string }
  Appointments: undefined
  AppointmentDetail: { bookingId: string }
  PaymentWallet: undefined
  AddCard: undefined
  Profile: undefined
  Referral: undefined
  Conversations: undefined
  Chat: { conversationId: string; otherName: string; draftMessage?: string }
  BusinessMap: undefined

  // Admin
  AdminTabs: undefined
  AdminClientDetail: { clientId: string; clientName: string }
  AdminBusinessDetail: { businessId: string; businessName: string }

  // Business — Stack (non-tab screens)
  BusinessProfileEdit: undefined
  BusinessEmployees: undefined
  BusinessWorkingHours: undefined

  // Business — Main tabs
  BusinessTabs: undefined

  // Business — Stack
  BusinessDashboard: undefined
  BusinessSchedule: undefined
  BusinessServices: undefined
  BusinessEarnings: undefined
  BusinessSettings: undefined
}

export type ClientTabParamList = {
  HomeTab: undefined
  AppointmentsTab: undefined
  ProfileTab: undefined
}

export type AdminTabParamList = {
  AdminDashboardTab: undefined
  AdminBusinessesTab: undefined
  AdminClientsTab: undefined
  AdminFinanceTab: undefined
  AdminComplaintsTab: undefined
}

export type BusinessTabParamList = {
  DashboardTab: undefined
  ScheduleTab: undefined
  ServicesTab: undefined
  EarningsTab: undefined
  SettingsTab: undefined
}
