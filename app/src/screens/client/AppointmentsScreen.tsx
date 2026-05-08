import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { BookingCard } from '../../components/booking/BookingCard'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { fetchMyBookings, requestCancelWithRefund } from '../../services/bookingsService'
import { useBookingStore } from '../../store/bookingStore'
import { BookingItem } from '../../types/booking'
import { RootStackParamList } from '../../navigation/types'
import { colors } from '../../theme/colors'

type Nav = NativeStackNavigationProp<RootStackParamList>
type Tab = 'upcoming' | 'past'

export default function AppointmentsScreen() {
  const navigation = useNavigation<Nav>()
  const { resetDraft, setDraftField } = useBookingStore()

  const [tab, setTab] = useState<Tab>('upcoming')
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<BookingItem | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [requestSent, setRequestSent] = useState<'cancel' | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await fetchMyBookings(tab)
      setBookings(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tab])

  // Reload whenever screen comes into focus (e.g. after booking success)
  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await requestCancelWithRefund(cancelTarget.id)
      setCancelTarget(null)
      setRequestSent('cancel')
      load()
    } catch {
      setCancelTarget(null)
    } finally {
      setCancelling(false)
    }
  }

  function handleReschedule(booking: BookingItem) {
    navigation.navigate('RescheduleRequest', {
      bookingId: booking.id,
      stylistId: booking.stylistId,
      serviceId: booking.serviceId,
      serviceName: booking.service.nameHe,
    })
  }

  function handleRebook(booking: BookingItem) {
    resetDraft()
    setDraftField('businessId', booking.service.businessId)
    navigation.navigate('ServiceSelect', { businessId: booking.service.businessId })
  }

  function handleReview(booking: BookingItem) {
    navigation.navigate('Review', { bookingId: booking.id, serviceName: booking.service.nameHe })
  }

  const isUpcoming = tab === 'upcoming'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>התורים שלי</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, !isUpcoming && styles.tabActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabLabel, !isUpcoming && styles.tabLabelActive]}>עבר</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, isUpcoming && styles.tabActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabLabel, isUpcoming && styles.tabLabelActive]}>קרובים</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onCancel={(id) => setCancelTarget(bookings.find((b) => b.id === id) ?? null)}
              onReschedule={handleReschedule}
              onRebook={handleRebook}
              onReview={handleReview}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={colors.primaryLight} />
              <Text style={styles.emptyTitle}>
                {isUpcoming ? 'אין לך תורים קרובים' : 'אין היסטוריית תורים'}
              </Text>
              {isUpcoming && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => navigation.navigate('Search', {})}
                >
                  <Text style={styles.emptyBtnText}>הזמיני תור עכשיו</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Cancel request confirm sheet */}
      {cancelTarget && (
        <ConfirmSheet
          visible={!!cancelTarget}
          title="בקשת ביטול עם החזר"
          message="בקשתך תישלח לעסק לאישור. לאחר האישור תקבלי זיכוי לארנק שלך באפליקציה."
          confirmLabel="שלחי בקשה"
          cancelLabel="חזרה"
          destructive
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}

      {/* Request sent confirmation */}
      <ConfirmSheet
        visible={requestSent === 'cancel'}
        title="הבקשה נשלחה"
        message="בקשת הביטול נשלחה לעסק. תקבלי עדכון לאחר שיטופל."
        confirmLabel="הבנתי"
        onConfirm={() => setRequestSent(null)}
        onCancel={() => setRequestSent(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'left' },
  tabs: {
    flexDirection: 'row-reverse',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: '#fff' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 20, paddingBottom: 32 },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 14,
  },
  emptyTitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
