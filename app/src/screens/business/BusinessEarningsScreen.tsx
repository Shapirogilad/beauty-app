import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { he } from 'date-fns/locale'
import { colors } from '../../theme/colors'
import { formatPrice } from '../../utils/shabbat'
import {
  getMonthlyEarnings, getEarningsByService, getEarningsByStylist,
  MonthlyEarnings, ServiceEarning, StylistEarning,
} from '../../services/growthService'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BAR_MAX_HEIGHT = 120
const BAR_AREA_WIDTH = SCREEN_WIDTH - 40 - 32  // screen - padding - card padding

type Tab = 'chart' | 'service' | 'stylist'

export default function BusinessEarningsScreen() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [tab, setTab] = useState<Tab>('chart')
  const [monthly, setMonthly] = useState<MonthlyEarnings | null>(null)
  const [byService, setByService] = useState<ServiceEarning[]>([])
  const [byStylist, setByStylist] = useState<StylistEarning[]>([])
  const [loading, setLoading] = useState(true)

  const last6Start = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd')
  const todayEnd    = format(endOfMonth(new Date()), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [m, s, st] = await Promise.all([
        getMonthlyEarnings(year),
        getEarningsByService(last6Start, todayEnd),
        getEarningsByStylist(last6Start, todayEnd),
      ])
      setMonthly(m)
      setByService(s)
      setByStylist(st)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [year])

  useEffect(() => { load() }, [load])

  const maxRevenue = monthly ? Math.max(...monthly.months.map((m) => m.revenueAgorot), 1) : 1

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>הכנסות</Text>
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.yearBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.yearText}>{year}</Text>
          <TouchableOpacity
            onPress={() => setYear((y) => y + 1)}
            style={styles.yearBtn}
            disabled={year >= currentYear}
          >
            <Ionicons name="chevron-forward" size={20} color={year >= currentYear ? colors.placeholder : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {(['chart', 'service', 'stylist'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'chart' ? 'גרף שנתי' : t === 'service' ? 'לפי שירות' : 'לפי מעצבת'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Total */}
          {monthly && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>סה"כ {year}</Text>
              <Text style={styles.totalAmount}>{formatPrice(monthly.totalAgorot)}</Text>
            </View>
          )}

          {/* Bar chart */}
          {tab === 'chart' && monthly && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>הכנסות חודשיות</Text>
              <View style={styles.barsContainer}>
                {monthly.months.map((m) => {
                  const barH = maxRevenue > 0
                    ? Math.max(4, Math.round((m.revenueAgorot / maxRevenue) * BAR_MAX_HEIGHT))
                    : 4
                  const barW = Math.floor((BAR_AREA_WIDTH / 12) - 6)
                  return (
                    <View key={m.monthNum} style={styles.barCol}>
                      <Text style={styles.barValue}>
                        {m.revenueAgorot > 0 ? `${Math.round(m.revenueAgorot / 100)}` : ''}
                      </Text>
                      <View style={[styles.bar, { height: barH, width: barW, backgroundColor: m.revenueAgorot > 0 ? colors.primary : colors.border }]} />
                      <Text style={styles.barLabel}>{m.month}</Text>
                    </View>
                  )
                })}
              </View>
              <Text style={styles.barHint}>* הסכומים בשקלים</Text>
            </View>
          )}

          {/* By service */}
          {tab === 'service' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>לפי שירות (6 חודשים אחרונים)</Text>
              {byService.length === 0 ? (
                <Text style={styles.emptyText}>אין נתונים בטווח זה</Text>
              ) : byService.map((s, i) => (
                <View key={i} style={styles.rankRow}>
                  <View style={styles.rankRight}>
                    <Text style={styles.rankName}>{s.nameHe}</Text>
                    <Text style={styles.rankSub}>{s.count} הזמנות</Text>
                  </View>
                  <Text style={styles.rankAmount}>{formatPrice(s.revenueAgorot)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* By stylist */}
          {tab === 'stylist' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>לפי מעצבת (6 חודשים אחרונים)</Text>
              {byStylist.length === 0 ? (
                <Text style={styles.emptyText}>אין נתונים בטווח זה</Text>
              ) : byStylist.map((s, i) => (
                <View key={i} style={styles.rankRow}>
                  <View style={styles.rankRight}>
                    <Text style={styles.rankName}>{s.name}</Text>
                    <Text style={styles.rankSub}>{s.count} הזמנות</Text>
                  </View>
                  <Text style={styles.rankAmount}>{formatPrice(s.revenueAgorot)}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yearBtn: { padding: 4 },
  yearText: { fontSize: 17, fontWeight: '600', color: colors.text, minWidth: 50, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  tabLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  content: { padding: 20, gap: 16 },
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: '#fff' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'left' },
  barsContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_MAX_HEIGHT + 40,
    paddingTop: 20,
  },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { borderRadius: 4 },
  barValue: { fontSize: 8, color: colors.textSecondary, textAlign: 'center' },
  barLabel: { fontSize: 9, color: colors.textSecondary },
  barHint: { fontSize: 11, color: colors.placeholder, textAlign: 'center', marginTop: -8 },
  rankRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankRight: { flex: 1, gap: 2 },
  rankName: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'left' },
  rankSub: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  rankAmount: { fontSize: 16, fontWeight: '700', color: colors.primary },
  emptyText: { fontSize: 14, color: colors.placeholder, textAlign: 'center', paddingVertical: 20 },
})
