import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { fetchAdminFinance, AdminFinance } from '../../services/adminService'
import { colors } from '../../theme/colors'

function ils(agorot: number) {
  return `₪${(agorot / 100).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'הושלם', PENDING: 'ממתין', FAILED: 'נכשל',
  REFUNDED: 'הוחזר', PARTIALLY_REFUNDED: 'הוחזר חלקית',
}
const PAYMENT_STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#4BAD8A', PENDING: '#F59E0B', FAILED: colors.error,
  REFUNDED: '#5B8BDF', PARTIALLY_REFUNDED: '#9B6DB5',
}

export default function AdminFinanceScreen() {
  const [data, setData] = useState<AdminFinance | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try { setData(await fetchAdminFinance()) }
    catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>כספים</Text></View>
      <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}><Text style={styles.title}>כספים</Text></View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הכנסות</Text>
          <View style={styles.revenueGrid}>
            <RevenueCard label="היום" value={ils(data?.revenueToday ?? 0)} color="#4BAD8A" icon="today" />
            <RevenueCard label="השבוע" value={ils(data?.revenueThisWeek ?? 0)} color="#5B8BDF" icon="calendar" />
            <RevenueCard label="החודש" value={ils(data?.revenueThisMonth ?? 0)} color="#9B6DB5" icon="calendar-number" />
            <RevenueCard label="סה״כ" value={ils(data?.revenueTotal ?? 0)} color="#D4956A" icon="cash" />
          </View>
          <View style={styles.avgCard}>
            <Ionicons name="stats-chart" size={20} color={colors.primary} />
            <Text style={styles.avgLabel}>ממוצע להזמנה</Text>
            <Text style={styles.avgValue}>{ils(data?.avgBookingValue ?? 0)}</Text>
          </View>
        </View>

        {/* Payment status breakdown */}
        {data?.paymentStatusBreakdown && Object.keys(data.paymentStatusBreakdown).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>סטטוס תשלומים</Text>
            <View style={styles.breakdownCard}>
              {Object.entries(data.paymentStatusBreakdown).map(([status, count]) => {
                const color = PAYMENT_STATUS_COLOR[status] ?? colors.placeholder
                return (
                  <View key={status} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownCount, { color }]}>{count}</Text>
                    <View style={styles.breakdownBar}>
                      <View style={[styles.breakdownFill, { backgroundColor: color, flex: count }]} />
                      <View style={{ flex: Math.max(0, 20 - count) }} />
                    </View>
                    <View style={[styles.breakdownDot, { backgroundColor: color }]} />
                    <Text style={styles.breakdownLabel}>{PAYMENT_STATUS_LABEL[status] ?? status}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Top businesses */}
        {data?.topBusinesses && data.topBusinesses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>עסקים מובילים</Text>
            <View style={styles.topList}>
              {data.topBusinesses.map((biz, i) => (
                <View key={biz.id} style={styles.topRow}>
                  <Text style={styles.topRevenue}>{ils(biz.revenueAgorot)}</Text>
                  <View style={styles.topInfo}>
                    <Text style={styles.topName}>{biz.name}</Text>
                    <Text style={styles.topSub}>{biz.bookingCount} הזמנות</Text>
                  </View>
                  <View style={[styles.rankBadge, i === 0 && styles.rankGold]}>
                    <Text style={[styles.rankText, i === 0 && styles.rankTextGold]}>#{i + 1}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent payments */}
        {data?.recentPayments && data.recentPayments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>תשלומים אחרונים</Text>
            <View style={styles.paymentsList}>
              {data.recentPayments.map((p) => {
                const color = PAYMENT_STATUS_COLOR[p.status] ?? colors.placeholder
                return (
                  <View key={p.id} style={styles.paymentRow}>
                    <View style={styles.paymentLeft}>
                      <Text style={styles.paymentAmount}>{ils(p.amountAgorot)}</Text>
                      <View style={[styles.paymentStatus, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.paymentStatusText, { color }]}>
                          {PAYMENT_STATUS_LABEL[p.status] ?? p.status}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentClient}>{p.booking.client.name}</Text>
                      <Text style={styles.paymentMeta}>
                        {p.booking.stylist.business.name} · {p.booking.service.nameHe}
                      </Text>
                      <Text style={styles.paymentDate}>
                        {format(new Date(p.createdAt), 'dd/MM/yy HH:mm', { locale: he })}
                      </Text>
                    </View>
                    {p.cardLast4 && (
                      <View style={styles.cardChip}>
                        <Ionicons name="card-outline" size={12} color={colors.textSecondary} />
                        <Text style={styles.cardLast4}>···{p.cardLast4}</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function RevenueCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[styles.revenueCard, { borderColor: color + '40' }]}>
      <View style={[styles.revenueIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.revenueValue, { color }]}>{value}</Text>
      <Text style={styles.revenueLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left', marginBottom: 10 },
  section: {},

  revenueGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  revenueCard: {
    width: '47%', flexGrow: 1, backgroundColor: colors.surface,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 8,
    borderWidth: 1.5,
  },
  revenueIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  revenueValue: { fontSize: 18, fontWeight: '800' },
  revenueLabel: { fontSize: 12, color: colors.textSecondary },
  avgCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 10,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  avgLabel: { flex: 1, fontSize: 14, color: colors.textSecondary, textAlign: 'left' },
  avgValue: { fontSize: 18, fontWeight: '800', color: colors.primary },

  breakdownCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  breakdownRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: 13, color: colors.textSecondary, width: 90, textAlign: 'left' },
  breakdownBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, flexDirection: 'row', overflow: 'hidden' },
  breakdownFill: { borderRadius: 3 },
  breakdownCount: { fontSize: 13, fontWeight: '700', width: 28, textAlign: 'left' },

  topList: { gap: 8 },
  topRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  rankBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  rankGold: { backgroundColor: '#FEF3C7' },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  rankTextGold: { color: '#D97706' },
  topInfo: { flex: 1 },
  topName: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'left' },
  topSub: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  topRevenue: { fontSize: 15, fontWeight: '800', color: colors.primary },

  paymentsList: { gap: 8 },
  paymentRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  paymentLeft: { alignItems: 'flex-end', gap: 4, minWidth: 70 },
  paymentAmount: { fontSize: 14, fontWeight: '800', color: colors.text },
  paymentStatus: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  paymentStatusText: { fontSize: 10, fontWeight: '700' },
  paymentInfo: { flex: 1, gap: 2 },
  paymentClient: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'left' },
  paymentMeta: { fontSize: 11, color: colors.textSecondary, textAlign: 'left' },
  paymentDate: { fontSize: 11, color: colors.placeholder, textAlign: 'left' },
  cardChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3 },
  cardLast4: { fontSize: 11, color: colors.textSecondary },
})
