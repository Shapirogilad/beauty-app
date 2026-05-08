import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { addDays, format, isSameDay, isSaturday } from 'date-fns'
import { he } from 'date-fns/locale'
import { RootStackParamList } from '../../navigation/types'
import { fetchAvailableSlots } from '../../services/slotsService'
import { requestReschedule } from '../../services/bookingsService'
import { TimeSlotGrid } from '../../components/booking/TimeSlotGrid'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'RescheduleRequest'>

const DAYS_AHEAD = 30

function buildDateList(): Date[] {
  const dates: Date[] = []
  for (let i = 1; i <= DAYS_AHEAD; i++) {
    const d = addDays(new Date(), i)
    if (!isSaturday(d)) dates.push(d)
  }
  return dates
}

export default function RescheduleRequestScreen({ route, navigation }: Props) {
  const { bookingId, stylistId, serviceId, serviceName } = route.params

  const dates = buildDateList()
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const loadSlots = useCallback(async (date: Date) => {
    setSlotsLoading(true)
    setSelectedSlot(null)
    try {
      const result = await fetchAvailableSlots(stylistId, serviceId, format(date, 'yyyy-MM-dd'))
      setSlots(result.slots)
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [stylistId, serviceId])

  useEffect(() => { loadSlots(selectedDate) }, [selectedDate, loadSlots])

  async function handleSubmit() {
    if (!selectedSlot) return
    setSubmitting(true)
    try {
      await requestReschedule(bookingId, selectedSlot, note.trim() || undefined)
      setDone(true)
    } catch {
      // error ignored — user can retry
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.doneContainer}>
          <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
          <Text style={styles.doneTitle}>הבקשה נשלחה!</Text>
          <Text style={styles.doneSubtitle}>
            בקשת שינוי המועד נשלחה לעסק.{'\n'}תקבלי עדכון לאחר שיטופל.
          </Text>
          <Button label="חזרה לתורים" onPress={() => navigation.goBack()} style={styles.doneBtn} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>שינוי מועד</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>בחרי מועד חדש עבור: {serviceName}</Text>

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
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateDay, selected && styles.dateDaySelected]}>
                {format(date, 'EEE', { locale: he })}
              </Text>
              <Text style={[styles.dateNum, selected && styles.dateNumSelected]}>
                {format(date, 'd')}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.content}>
        {/* Slots */}
        <Text style={styles.sectionLabel}>
          {format(selectedDate, "EEEE, d בMMMM", { locale: he })}
        </Text>

        {slotsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Ionicons name="calendar-outline" size={36} color={colors.border} />
            <Text style={styles.noSlotsText}>אין זמנים פנויים בתאריך זה</Text>
          </View>
        ) : (
          <TimeSlotGrid
            slots={slots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
          />
        )}

        {/* Note */}
        <Text style={styles.sectionLabel}>הערה לעסק (אופציונלי)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="הוסיפי הסבר לבקשה..."
          placeholderTextColor={colors.placeholder}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          textAlign="right"
        />
      </View>

      <View style={styles.bottom}>
        <Button
          label="שלחי בקשה"
          onPress={handleSubmit}
          disabled={!selectedSlot}
          loading={submitting}
          style={styles.submitBtn}
        />
      </View>
    </SafeAreaView>
    </KeyboardAvoidingView>
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
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'left',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dateStrip: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  dateChip: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 52,
  },
  dateChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateDay: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  dateDaySelected: { color: '#fff' },
  dateNum: { fontSize: 16, fontWeight: '700', color: colors.text },
  dateNumSelected: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left', marginTop: 8 },
  noSlots: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  noSlotsText: { fontSize: 14, color: colors.textSecondary },
  noteInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  submitBtn: { width: '100%' },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  doneSubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  doneBtn: { marginTop: 8, width: '100%' },
})
