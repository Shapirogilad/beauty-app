import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { addDays, format, isSameDay, isToday, isSaturday } from 'date-fns'
import { he } from 'date-fns/locale'
import { RootStackParamList } from '../../navigation/types'
import { fetchAvailableSlots } from '../../services/slotsService'
import { joinWaitlist } from '../../services/waitlistService'
import { useBookingStore } from '../../store/bookingStore'
import { TimeSlotGrid } from '../../components/booking/TimeSlotGrid'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'DateTimeSelect'>

const DAYS_AHEAD = 30

function buildDateList(): Date[] {
  const dates: Date[] = []
  let cursor = new Date()
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = addDays(cursor, i)
    if (!isSaturday(d)) dates.push(d) // skip Shabbat
  }
  return dates
}

export default function DateTimeSelectScreen({ route, navigation }: Props) {
  const { stylistId, serviceId } = route.params
  const setDraftField = useBookingStore((s) => s.setDraftField)

  const dates = buildDateList()
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [joinedWaitlist, setJoinedWaitlist] = useState(false)
  const [joiningWaitlist, setJoiningWaitlist] = useState(false)

  const loadSlots = useCallback(async (date: Date) => {
    setLoading(true)
    setSelectedSlot(null)
    try {
      const result = await fetchAvailableSlots(
        stylistId,
        serviceId,
        format(date, 'yyyy-MM-dd'),
      )
      setSlots(result.slots)
    } catch {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [stylistId, serviceId])

  useEffect(() => { loadSlots(selectedDate) }, [selectedDate, loadSlots])

  function handleDateSelect(date: Date) {
    setSelectedDate(date)
    setJoinedWaitlist(false)
  }

  const waitlistDateFrom = selectedDate
  const waitlistDateTo = addDays(selectedDate, 6)
  const waitlistFromLabel = format(waitlistDateFrom, 'd בMMMM', { locale: he })
  const waitlistToLabel = format(waitlistDateTo, 'd בMMMM', { locale: he })

  async function handleJoinWaitlist() {
    setJoiningWaitlist(true)
    try {
      await joinWaitlist(
        serviceId,
        format(waitlistDateFrom, 'yyyy-MM-dd'),
        format(waitlistDateTo, 'yyyy-MM-dd'),
      )
      setJoinedWaitlist(true)
    } finally {
      setJoiningWaitlist(false)
    }
  }

  function handleContinue() {
    if (!selectedSlot) return
    setDraftField('slotStart', selectedSlot)
    navigation.navigate('BookingConfirm', { stylistId, serviceId, slotStart: selectedSlot })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>בחרי תאריך ושעה</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Date strip */}
      <FlatList
        data={dates}
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d.toISOString()}
        contentContainerStyle={styles.dateStrip}
        renderItem={({ item: date }) => {
          const selected = isSameDay(date, selectedDate)
          return (
            <TouchableOpacity
              style={[styles.dateChip, selected && styles.dateChipSelected]}
              onPress={() => handleDateSelect(date)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateDay, selected && styles.dateDaySelected]}>
                {format(date, 'EEE', { locale: he })}
              </Text>
              <Text style={[styles.dateNum, selected && styles.dateNumSelected]}>
                {format(date, 'd')}
              </Text>
              {isToday(date) && (
                <Text style={[styles.todayLabel, selected && styles.todayLabelSelected]}>היום</Text>
              )}
            </TouchableOpacity>
          )
        }}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>
          {format(selectedDate, 'EEEE, d בMMMM', { locale: he })}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <TimeSlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
            />

            {/* Waitlist — always visible */}
            <View style={styles.waitlistSection}>
              {joinedWaitlist ? (
                <View style={styles.waitlistSuccess}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.waitlistSuccessText}>
                    נוספת לרשימת ההמתנה בין {waitlistFromLabel} ל-{waitlistToLabel} — נעדכן אותך כשיפנה מקום
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.waitlistBox}
                  onPress={handleJoinWaitlist}
                  disabled={joiningWaitlist}
                  activeOpacity={0.75}
                >
                  <View style={styles.waitlistBoxTop}>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={styles.waitlistBoxTitle}>אין שעה מתאימה?</Text>
                  </View>
                  <Text style={styles.waitlistBoxSub}>
                    הצטרפי לרשימת המתנה לשבוע הקרוב ({waitlistFromLabel}–{waitlistToLabel}) ונעדכן אותך כשיתפנה מקום
                  </Text>
                  {joiningWaitlist ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
                  ) : (
                    <View style={styles.waitlistJoinBtn}>
                      <Text style={styles.waitlistJoinBtnText}>הצטרפי לרשימת המתנה</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label="המשיכי לאישור"
          onPress={handleContinue}
          disabled={!selectedSlot}
          style={styles.button}
        />
      </View>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  dateStrip: { paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 56,
    gap: 2,
  },
  dateChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateDay: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  dateDaySelected: { color: 'rgba(255,255,255,0.8)' },
  dateNum: { fontSize: 18, fontWeight: '700', color: colors.text },
  dateNumSelected: { color: '#fff' },
  todayLabel: { fontSize: 9, color: colors.primary, fontWeight: '600' },
  todayLabelSelected: { color: 'rgba(255,255,255,0.9)' },
  content: { padding: 20, gap: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'left' },
  loader: { marginTop: 24 },
  bottom: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  button: { width: '100%' },
  waitlistSection: { marginTop: 4 },
  waitlistBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    gap: 8,
  },
  waitlistBoxTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  waitlistBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'left',
  },
  waitlistBoxSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'left',
    lineHeight: 20,
  },
  waitlistJoinBtn: {
    marginTop: 4,
    backgroundColor: colors.primaryFaint,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  waitlistJoinBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  waitlistSuccess: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
  },
  waitlistSuccessText: {
    fontSize: 13,
    color: colors.success,
    flex: 1,
    textAlign: 'left',
    lineHeight: 20,
  },
})
