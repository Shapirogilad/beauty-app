import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { RootStackParamList } from '../../navigation/types'
import {
  fetchAdminStats, fetchAdminBookings, fetchPendingBusinesses,
  AdminStats, AdminBooking,
} from '../../services/adminService'
import { fetchAdminComplaints } from '../../services/complaintsService'
import { useAuthStore } from '../../store/authStore'
import { colors } from '../../theme/colors'

type Nav = NativeStackNavigationProp<RootStackParamList>

function formatILS(agorot: number) {
  return `₪${(agorot / 100).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
}

const BOOKING_STATUS_LABEL: Record<string, string> = {
  PENDING: 'ממתין', CONFIRMED: 'מאושר', CANCELLED: 'בוטל',
  COMPLETED: 'הושלם', NO_SHOW: 'לא הגיע',
}
const BOOKING_STATUS_COLOR: Record<string, string> = {
  CONFIRMED: '#4BAD8A', COMPLETED: '#5B8BDF', CANCELLED: colors.error,
  PENDING: '#E07B54', NO_SHOW: colors.placeholder,
}

export default function AdminDashboardScreen() {
  const nav = useNavigation<Nav>()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [stats, setStats]           = useState<AdminStats | null>(null)
  const [bookings, setBookings]     = useState<AdminBooking[]>([])
  const [pendingCount, setPending]  = useState(0)
  const [openComplaints, setOpen]   = useState(0)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, b, pending, complaints] = await Promise.all([
        fetchAdminStats(),
        fetchAdminBookings(8),
        fetchPendingBusinesses(),
        fetchAdminComplaints('OPEN'),
      ])
      setStats(s); setBookings(b)
      setPending(pending.length); setOpen(complaints.length)
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function handleLogout() {
    Alert.alert('התנתקות', 'לצאת מחשבון המנהל?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'יציאה', style: 'destructive', onPress: clearAuth },
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>לוח בקרה</Text>
        <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Alerts */}
          {(pendingCount > 0 || openComplaints > 0) && (
            <View style={styles.alertsSection}>
              <Text style={styles.sectionTitle}>התראות</Text>
              {pendingCount > 0 && (
                <View style={[styles.alertCard, { borderColor: '#F59E0B' }]}>
                  <Ionicons name="time" size={20} color="#F59E0B" />
                  <View style={styles.alertBody}>
                    <Text style={styles.alertTitle}>{pendingCount} בקשות הצטרפות ממתינות לאישור</Text>
                    <Text style={styles.alertSub}>בעלי עסקים שנרשמו וממתינים לאישורך</Text>
                  </View>
                </View>
              )}
              {openComplaints > 0 && (
                <View style={[styles.alertCard, { borderColor: colors.error }]}>
                  <Ionicons name="flag" size={20} color={colors.error} />
                  <View style={styles.alertBody}>
                    <Text style={styles.alertTitle}>{openComplaints} תלונות פתוחות</Text>
                    <Text style={styles.alertSub}>תלונות לקוחות הדורשות טיפול</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Stats grid */}
          {stats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>סטטיסטיקות</Text>
              <View style={styles.statsGrid}>
                <StatCard icon="people" label="לקוחות" value={stats.totalClients.toLocaleString()} color="#5B8BDF" />
                <StatCard icon="storefront" label="עסקים" value={stats.totalBusinesses.toLocaleString()} color="#9B6DB5" />
                <StatCard icon="calendar" label="הזמנות" value={stats.totalBookings.toLocaleString()} color="#E07B54" />
                <StatCard icon="today" label="היום" value={stats.bookingsToday.toLocaleString()} color="#4BAD8A" />
                <StatCard icon="cash" label="הכנסות" value={formatILS(stats.totalRevenueAgorot)} color="#D4956A" wide />
                <StatCard icon="person-add" label="חדשים (שבוע)" value={stats.newClientsThisWeek.toLocaleString()} color="#5B8BDF" wide />
              </View>
            </View>
          )}

          {/* Recent bookings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>הזמנות אחרונות</Text>
            {bookings.length === 0 ? (
              <Text style={styles.emptyText}>אין הזמנות עדיין</Text>
            ) : (
              <View style={styles.bookingsList}>
                {bookings.map((b) => {
                  const color = BOOKING_STATUS_COLOR[b.status] ?? colors.placeholder
                  return (
                    <View key={b.id} style={styles.bookingRow}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingClient}>{b.client.name}</Text>
                        <Text style={styles.bookingMeta}>
                          {b.stylist.business.name} · {b.service.nameHe}
                        </Text>
                        <Text style={styles.bookingDate}>
                          {format(new Date(b.startAt), 'dd/MM/yy HH:mm', { locale: he })}
                        </Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.statusText, { color }]}>
                          {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function StatCard({ icon, label, value, color, wide }: {
  icon: string; label: string; value: string; color: string; wide?: boolean
}) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left', marginBottom: 10 },

  alertsSection: { gap: 10 },
  alertCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1.5,
  },
  alertBody: { flex: 1, gap: 2 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'left' },
  alertSub: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },

  section: {},
  statsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: colors.surface, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  statCardWide: { width: '47%' },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },

  bookingsList: { gap: 8 },
  bookingRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  bookingInfo: { flex: 1, gap: 2 },
  bookingClient: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'left' },
  bookingMeta: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  bookingDate: { fontSize: 11, color: colors.placeholder, textAlign: 'left' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  emptyText: { fontSize: 14, color: colors.placeholder, textAlign: 'center', paddingVertical: 20 },
})
