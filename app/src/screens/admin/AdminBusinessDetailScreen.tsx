import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { RootStackParamList } from '../../navigation/types'
import { fetchAdminBusiness, AdminBusinessDetail } from '../../services/adminService'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'AdminBusinessDetail'>

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'ממתין', CONFIRMED: 'מאושר', CANCELLED: 'בוטל',
  COMPLETED: 'הושלם', NO_SHOW: 'לא הגיע',
}

const CATEGORY_LABELS: Record<string, string> = {
  hair: 'שיער', nails: 'ציפורניים', manicure: 'מניקור', laser: 'לייזר',
  waxing: 'שעווה', eyebrows: 'גבות', eyelashes: 'ריסים', facial: 'פנים',
  massage: 'עיסוי', makeup: 'איפור',
}

function formatILS(agorot: number) {
  return `₪${(agorot / 100).toFixed(0)}`
}

export default function AdminBusinessDetailScreen({ route }: Props) {
  const nav = useNavigation()
  const { businessId } = route.params
  const [business, setBusiness] = useState<AdminBusinessDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminBusiness(businessId)
      setBusiness(data)
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון פרטי עסק')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (!business) return null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{business.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.cardText}>{business.address}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.cardText}>
              {business.owner.name} · {business.owner.phone}
            </Text>
          </View>
          {business.owner.email ? (
            <View style={styles.cardRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.cardText}>{business.owner.email}</Text>
            </View>
          ) : null}
          <View style={styles.cardRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.cardText}>
              {business.category.map((c) => CATEGORY_LABELS[c] ?? c).join(' · ')}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.cardText}>
              פעיל מ-{format(new Date(business.createdAt), 'dd/MM/yyyy', { locale: he })}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{business.bookingCount}</Text>
            <Text style={styles.statLbl}>הזמנות</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{formatILS(business.revenueAgorot)}</Text>
            <Text style={styles.statLbl}>הכנסות</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{business.stylists.length}</Text>
            <Text style={styles.statLbl}>מעצבות</Text>
          </View>
        </View>

        {/* Stylists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>מעצבות</Text>
          {business.stylists.map((s) => (
            <View key={s.id} style={styles.stylistRow}>
              <View style={styles.stylistAvatar}>
                <Text style={styles.stylistLetter}>{s.name.charAt(0)}</Text>
              </View>
              <Text style={styles.stylistName}>{s.name}</Text>
              <Text style={styles.stylistBookings}>{s._count.bookings} תורים</Text>
            </View>
          ))}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>שירותים ({business.services.length})</Text>
          {business.services.map((s) => (
            <View key={s.id} style={styles.serviceRow}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{s.nameHe}</Text>
                <Text style={styles.serviceDuration}>{s.durationMinutes} דקות</Text>
              </View>
              <Text style={styles.servicePrice}>{formatILS(s.price)}</Text>
            </View>
          ))}
        </View>

        {/* Recent bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הזמנות אחרונות</Text>
          {business.recentBookings.length === 0 ? (
            <Text style={styles.emptyText}>אין הזמנות</Text>
          ) : (
            business.recentBookings.map((b) => (
              <View key={b.id} style={styles.bookingRow}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingClient}>{b.client.name}</Text>
                  <Text style={styles.bookingMeta}>{b.service.nameHe}</Text>
                  <Text style={styles.bookingDate}>
                    {format(new Date(b.startAt), 'dd/MM/yy HH:mm', { locale: he })}
                  </Text>
                </View>
                <View style={styles.bookingRight}>
                  <Text style={styles.bookingPrice}>{formatILS(b.service.price)}</Text>
                  <Text style={styles.bookingStatus}>{STATUS_LABEL[b.status] ?? b.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  cardText: { fontSize: 14, color: colors.text, flex: 1, textAlign: 'left', lineHeight: 20 },
  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLbl: { fontSize: 11, color: colors.textSecondary },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  stylistRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stylistAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stylistLetter: { fontSize: 15, fontWeight: '700', color: colors.primary },
  stylistName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'left' },
  stylistBookings: { fontSize: 12, color: colors.textSecondary },
  serviceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceInfo: { gap: 2 },
  serviceName: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'left' },
  serviceDuration: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  servicePrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  emptyText: { color: colors.placeholder, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  bookingRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingInfo: { flex: 1, gap: 2 },
  bookingClient: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'left' },
  bookingMeta: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  bookingDate: { fontSize: 11, color: colors.placeholder, textAlign: 'left' },
  bookingRight: { alignItems: 'flex-end', gap: 4 },
  bookingPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  bookingStatus: { fontSize: 11, color: colors.textSecondary },
})
