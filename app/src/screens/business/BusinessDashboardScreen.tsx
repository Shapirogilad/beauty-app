import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/types'
import { Ionicons } from '@expo/vector-icons'
import { ChatBubbleIcon } from '../../components/ui/ChatBubbleIcon'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { useAuthStore } from '../../store/authStore'
import { fetchDashboardStats, fetchSchedule } from '../../services/businessOwnerService'
import { DashboardStats, ScheduleBooking } from '../../types/businessOwner'
import { formatPrice } from '../../utils/shabbat'
import { colors } from '../../theme/colors'

const BOOKING_STATUS_COLOR: Record<string, string> = {
  CONFIRMED: colors.success,
  PENDING:   '#F5A623',
  COMPLETED: colors.placeholder,
  CANCELLED: colors.error,
  NO_SHOW:   colors.error,
}

export default function BusinessDashboardScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todayBookings, setTodayBookings] = useState<ScheduleBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const [s, bookings] = await Promise.all([
        fetchDashboardStats(),
        fetchSchedule(today),
      ])
      setStats(s)
      setTodayBookings(bookings)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const todayLabel = format(new Date(), "EEEE, d בMMMM", { locale: he })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <ChatBubbleIcon />
          <View>
            <Text style={styles.greeting}>שלום, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.dateLabel}>{todayLabel}</Text>
          </View>
        </View>

        {/* Stats row */}
        {stats && (
          <View style={styles.statsRow}>
            <StatCard label="תורים היום" value={String(stats.todayCount)} icon="calendar" />
            <StatCard label="הכנסה היום" value={formatPrice(stats.todayRevenue)} icon="cash" />
            <StatCard label="ממתינים" value={String(stats.pendingCount)} icon="time" highlight={stats.pendingCount > 0} />
          </View>
        )}

        {/* Week revenue */}
        {stats && (
          <View style={styles.weekCard}>
            <View style={styles.weekLeft}>
              <Text style={styles.weekAmount}>{formatPrice(stats.weekRevenue)}</Text>
              <Text style={styles.weekLabel}>{stats.weekCount} תורים השבוע</Text>
            </View>
            <View style={styles.weekIcon}>
              <Ionicons name="trending-up" size={28} color={colors.primary} />
            </View>
            <Text style={styles.weekTitle}>הכנסה שבועית</Text>
          </View>
        )}

        {/* Today's bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>התורים של היום</Text>
          {todayBookings.length === 0 ? (
            <View style={styles.emptyDay}>
              <Ionicons name="sunny-outline" size={32} color={colors.primaryLight} />
              <Text style={styles.emptyText}>אין תורים להיום</Text>
            </View>
          ) : (
            todayBookings.map((booking) => (
              <DashboardBookingRow key={booking.id} booking={booking} />
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value, icon, highlight = false }: {
  label: string; value: string; icon: string; highlight?: boolean
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Ionicons name={icon as any} size={20} color={highlight ? colors.error : colors.primary} />
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function DashboardBookingRow({ booking }: { booking: ScheduleBooking }) {
  const start = new Date(booking.startAt)
  const end = new Date(booking.endAt)
  const statusColor = BOOKING_STATUS_COLOR[booking.status] ?? colors.textSecondary

  return (
    <View style={styles.bookingRow}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingClient}>{booking.client.name}</Text>
        <Text style={styles.bookingService}>{booking.service.nameHe}</Text>
      </View>
      <View style={styles.bookingTime}>
        <Text style={styles.timeText}>{format(start, 'HH:mm')}</Text>
        <Text style={styles.timeSub}>{format(end, 'HH:mm')}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'left' },
  dateLabel: { fontSize: 14, color: colors.textSecondary, textAlign: 'left' },

  // Stats
  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardHighlight: { borderColor: colors.error, backgroundColor: '#FFF5F5' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  statValueHighlight: { color: colors.error },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },

  // Week card
  weekCard: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    gap: 4,
  },
  weekTitle: { fontSize: 12, color: colors.primary, textAlign: 'left', fontWeight: '500' },
  weekLeft: { alignItems: 'flex-end' },
  weekAmount: { fontSize: 28, fontWeight: '700', color: colors.primary },
  weekLabel: { fontSize: 13, color: colors.primary, opacity: 0.7 },
  weekIcon: { position: 'absolute', left: 18, top: 18 },

  // Section
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
  emptyDay: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  // Booking row
  bookingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  bookingInfo: { flex: 1 },
  bookingClient: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'left' },
  bookingService: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  bookingTime: { alignItems: 'center' },
  timeText: { fontSize: 15, fontWeight: '700', color: colors.text },
  timeSub: { fontSize: 11, color: colors.textSecondary },
})
