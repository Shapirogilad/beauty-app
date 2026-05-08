import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
  TouchableOpacity, Modal, Pressable, Switch, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import {
  fetchWorkingHours, saveWorkingHours,
  fetchDateExceptions, upsertDateException, deleteDateException,
} from '../../services/businessOwnerService'
import { Button } from '../../components/ui/Button'
import { WorkingHoursEditor, TimePicker } from '../../components/business/WorkingHoursEditor'
import { WorkingHoursEntry, DateException } from '../../types/businessOwner'
import { HOLIDAY_MAP, IsraeliHoliday } from '../../utils/israeliHolidays'
import { colors } from '../../theme/colors'

// ─── Hebrew locale ────────────────────────────────────────────────────────────

LocaleConfig.locales['he'] = {
  monthNames: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
  monthNamesShort: ['ינו','פבר','מרץ','אפר','מאי','יוני','יול','אוג','ספט','אוק','נוב','דצמ'],
  dayNames: ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],
  dayNamesShort: ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'],
  today: 'היום',
}
LocaleConfig.defaultLocale = 'he'

// ─── Constants ────────────────────────────────────────────────────────────────

const DOT_GREEN  = '#22C55E'
const DOT_RED    = '#EF4444'
const DOT_ORANGE = '#F59E0B'

const DEFAULT_HOURS: WorkingHoursEntry[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  dayOfWeek: d,
  openTime: '09:00',
  closeTime: d === 5 ? '14:00' : '20:00',
  isClosed: d === 6,
  breaks: [],
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10) }
function currentMonthStr() { return new Date().toISOString().slice(0, 7) }

function formatDateHe(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
  return `${parseInt(d)} ב${months[parseInt(m) - 1]} ${y}`
}

/**
 * Priority for dot colour:
 *  1. User exception (orange = custom open, red = explicitly closed)
 *  2. Israeli holiday (orange = semi/חג חלקי, red = full/חג מלא)
 *  3. Regular weekly hours (green = open, red = closed day)
 */
function buildMarkedDates(
  hours: WorkingHoursEntry[],
  exceptions: DateException[],
  visibleMonth: string,
  selectedDate: string | null,
): Record<string, any> {
  const marks: Record<string, any> = {}
  const exMap = new Map(exceptions.map((e) => [e.date, e]))
  const [baseY, baseM] = visibleMonth.split('-').map(Number)

  for (let offset = -1; offset <= 1; offset++) {
    let y = baseY, m = baseM + offset
    if (m < 1)  { m += 12; y -= 1 }
    if (m > 12) { m -= 12; y += 1 }
    const daysInMonth = new Date(y, m, 0).getDate()

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayOfWeek = new Date(y, m - 1, d).getDay()
      const ex      = exMap.get(dateStr)
      const holiday = HOLIDAY_MAP.get(dateStr)

      let dotColor: string
      if (ex) {
        dotColor = ex.isClosed ? DOT_RED : DOT_ORANGE
      } else if (holiday) {
        dotColor = holiday.type === 'full' ? DOT_RED : DOT_ORANGE
      } else {
        const regular = hours.find((h) => h.dayOfWeek === dayOfWeek)
        dotColor = regular?.isClosed ? DOT_RED : DOT_GREEN
      }

      marks[dateStr] = { marked: true, dots: [{ key: 'status', color: dotColor }] }
    }
  }

  if (selectedDate) {
    marks[selectedDate] = {
      ...(marks[selectedDate] ?? {}),
      selected: true,
      selectedColor: colors.primary,
    }
  }

  return marks
}

// ─── Exception Modal ──────────────────────────────────────────────────────────

interface ExceptionModalProps {
  date: string | null
  existing: DateException | null
  holiday: IsraeliHoliday | null
  onClose: () => void
  onSave: (p: {
    isClosed: boolean; openTime?: string; closeTime?: string
    breaks?: { start: string; end: string }[]; note?: string
  }) => Promise<void>
  onDelete: () => Promise<void>
}

function ExceptionModal({ date, existing, holiday, onClose, onSave, onDelete }: ExceptionModalProps) {
  // Derive defaults: existing > holiday defaults > plain defaults
  const defaultClosed    = existing ? existing.isClosed : holiday?.type === 'full'
  const defaultCloseTime = existing?.closeTime ?? (holiday?.type === 'semi' ? '14:00' : '20:00')
  const defaultOpenTime  = existing?.openTime  ?? '09:00'

  const [isClosed, setIsClosed]   = useState(defaultClosed ?? false)
  const [openTime, setOpenTime]   = useState(defaultOpenTime)
  const [closeTime, setCloseTime] = useState(defaultCloseTime)
  const [breaks, setBreaks]       = useState<{ start: string; end: string }[]>(existing?.breaks ?? [])
  const [note, setNote]           = useState(existing?.note ?? '')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)

  if (!date) return null

  const isHolidayWithNoOverride = !!holiday && !existing

  function addBreak() { setBreaks((p) => [...p, { start: '13:00', end: '14:00' }]) }
  function removeBreak(i: number) { setBreaks((p) => p.filter((_, idx) => idx !== i)) }
  function updateBreak(i: number, field: 'start' | 'end', val: string) {
    setBreaks((p) => p.map((b, idx) => idx === i ? { ...b, [field]: val } : b))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        isClosed,
        openTime:  isClosed ? undefined : openTime,
        closeTime: isClosed ? undefined : closeTime,
        breaks:    isClosed ? [] : breaks,
        note:      note.trim() || undefined,
      })
      onClose()
    } catch {
      Alert.alert('שגיאה', 'שמירה נכשלה')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    Alert.alert('מחיקת חריגה', 'להסיר את השעות המיוחדות ולחזור לברירת המחדל?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר', style: 'destructive',
        onPress: async () => {
          setDeleting(true)
          try { await onDelete(); onClose() }
          catch { Alert.alert('שגיאה', 'מחיקה נכשלה') }
          finally { setDeleting(false) }
        },
      },
    ])
  }

  return (
    <Modal visible transparent animationType="slide">
      <Pressable style={ms.backdrop} onPress={onClose}>
        <ScrollView style={ms.sheetScroll} contentContainerStyle={ms.sheet}
          onStartShouldSetResponder={() => true} keyboardShouldPersistTaps="handled">

          <View style={ms.handle} />

          {/* Holiday badge */}
          {holiday && (
            <View style={[ms.holidayBadge, holiday.type === 'full' ? ms.badgeFull : ms.badgeSemi]}>
              <Ionicons
                name="star"
                size={12}
                color={holiday.type === 'full' ? DOT_RED : DOT_ORANGE}
              />
              <Text style={[ms.holidayBadgeText, { color: holiday.type === 'full' ? DOT_RED : '#92400E' }]}>
                {holiday.nameHe}
              </Text>
            </View>
          )}

          <Text style={ms.dateTitle}>{formatDateHe(date)}</Text>

          {/* Hint when showing holiday defaults */}
          {isHolidayWithNoOverride && (
            <Text style={ms.holidayHint}>
              {holiday!.type === 'full'
                ? 'ברירת מחדל: עסק סגור. ניתן לשנות ולשמור.'
                : 'ברירת מחדל: פתוח עד 14:00. ניתן לשנות ולשמור.'}
            </Text>
          )}

          {/* Closed toggle */}
          <View style={ms.row}>
            <Switch value={isClosed} onValueChange={setIsClosed}
              trackColor={{ false: colors.border, true: '#EF444430' }}
              thumbColor={isClosed ? colors.error : colors.placeholder} />
            <Text style={[ms.rowLabel, isClosed && { color: colors.error }]}>
              העסק סגור ביום זה
            </Text>
          </View>

          {!isClosed && (
            <>
              <View style={ms.timesRow}>
                <TimePicker value={closeTime} onChange={setCloseTime} label="סגירה" />
                <Text style={ms.dash}>—</Text>
                <TimePicker value={openTime}  onChange={setOpenTime}  label="פתיחה" />
              </View>

              {breaks.map((brk, idx) => (
                <View key={idx} style={ms.breakRow}>
                  <TouchableOpacity onPress={() => removeBreak(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                  <View style={ms.timesRow}>
                    <TimePicker value={brk.end}   onChange={(v) => updateBreak(idx, 'end', v)}   label="חזרה" />
                    <Text style={ms.dash}>—</Text>
                    <TimePicker value={brk.start} onChange={(v) => updateBreak(idx, 'start', v)} label="הפסקה" />
                  </View>
                  <Text style={ms.breakLabel}>הפסקה {idx + 1}</Text>
                </View>
              ))}

              <TouchableOpacity style={ms.addBreakBtn} onPress={addBreak} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={ms.addBreakText}>הוספת הפסקה</Text>
              </TouchableOpacity>
            </>
          )}

          <TextInput style={ms.noteInput} value={note} onChangeText={setNote}
            placeholder="הערה (אופציונלי) — לדוג׳: פתוח בשעות מיוחדות"
            placeholderTextColor={colors.placeholder} textAlign="right" />

          <Button label="שמרי" onPress={handleSave} loading={saving} style={ms.saveBtn} />

          {existing && (
            <TouchableOpacity style={ms.deleteBtn} onPress={handleDelete} disabled={deleting}>
              {deleting
                ? <ActivityIndicator color={colors.error} size="small" />
                : <Text style={ms.deleteBtnText}>
                    {holiday ? 'חזרה לברירת המחדל של החג' : 'הסר חריגה לתאריך זה'}
                  </Text>
              }
            </TouchableOpacity>
          )}

          <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
            <Text style={ms.cancelText}>ביטול</Text>
          </TouchableOpacity>
        </ScrollView>
      </Pressable>
    </Modal>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BusinessWorkingHoursScreen() {
  const nav = useNavigation()

  const [hours, setHours]           = useState<WorkingHoursEntry[]>(DEFAULT_HOURS)
  const [exceptions, setExceptions] = useState<DateException[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  const [visibleMonth, setVisibleMonth] = useState(currentMonthStr())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [hoursExpanded, setHoursExpanded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [hoursData, exData] = await Promise.all([fetchWorkingHours(), fetchDateExceptions()])
      if (hoursData.length > 0) {
        setHours(hoursData.map((h) => ({ ...h, breaks: Array.isArray(h.breaks) ? h.breaks : [] })))
      }
      setExceptions(exData)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleSaveHours() {
    setSaving(true)
    try {
      await saveWorkingHours(hours)
      Alert.alert('נשמר', 'שעות הפעילות עודכנו בהצלחה')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'לא ניתן היה לשמור'
      Alert.alert('שגיאה', Array.isArray(msg) ? msg.join('\n') : String(msg))
    } finally {
      setSaving(false)
    }
  }

  function openDay(date: string) {
    setSelectedDate(date)
    setModalOpen(true)
  }

  async function handleSaveException(payload: {
    isClosed: boolean; openTime?: string; closeTime?: string
    breaks?: { start: string; end: string }[]; note?: string
  }) {
    if (!selectedDate) return
    const updated = await upsertDateException({ date: selectedDate, ...payload })
    setExceptions((prev) =>
      [...prev.filter((e) => e.date !== selectedDate), updated]
        .sort((a, b) => a.date.localeCompare(b.date)),
    )
  }

  async function handleDeleteException() {
    if (!selectedDate) return
    await deleteDateException(selectedDate)
    setExceptions((prev) => prev.filter((e) => e.date !== selectedDate))
  }

  const markedDates      = buildMarkedDates(hours, exceptions, visibleMonth, selectedDate)
  const existingForSelected = selectedDate ? (exceptions.find((e) => e.date === selectedDate) ?? null) : null
  const holidayForSelected  = selectedDate ? (HOLIDAY_MAP.get(selectedDate) ?? null) : null

  // Exception cards: user overrides + holidays that haven't been overridden yet
  // Show upcoming holidays (next 90 days) that have no override, plus all existing overrides
  const today = todayStr()
  const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const exDateSet = new Set(exceptions.map((e) => e.date))
  const upcomingHolidays = Array.from(HOLIDAY_MAP.values()).filter(
    (h) => h.date >= today && h.date <= in90Days && !exDateSet.has(h.date),
  )

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>שעות פעילות</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Calendar ──────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.hint}>לחצי על תאריך להגדרת שעות מיוחדות או סגירה</Text>

          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: DOT_GREEN }]} />
              <Text style={s.legendText}>פתוח</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: DOT_ORANGE }]} />
              <Text style={s.legendText}>שעות מיוחדות</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: DOT_RED }]} />
              <Text style={s.legendText}>סגור</Text>
            </View>
          </View>

          <Calendar
            onDayPress={(day) => openDay(day.dateString)}
            onMonthChange={(month) => setVisibleMonth(month.dateString.slice(0, 7))}
            markedDates={markedDates}
            markingType="multi-dot"
            firstDay={0}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#fff',
              todayTextColor: colors.primary,
              todayBackgroundColor: colors.primaryFaint,
              dayTextColor: colors.text,
              textDisabledColor: colors.placeholder,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              textMonthFontWeight: '700',
              textDayFontSize: 14,
              textMonthFontSize: 15,
            }}
            style={s.calendar}
          />
        </View>

        {/* ── Upcoming holidays + user overrides ────────────── */}
        {(upcomingHolidays.length > 0 || exceptions.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>תאריכים מיוחדים</Text>

            {/* Upcoming holidays with default hours (no override yet) */}
            {upcomingHolidays.map((h) => (
              <TouchableOpacity key={h.date} style={s.exCard}
                onPress={() => openDay(h.date)} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={16} color={colors.placeholder} />
                <View style={s.exInfo}>
                  <Text style={s.exDate}>{formatDateHe(h.date)}</Text>
                  <Text style={s.exHolidayName}>{h.nameHe}</Text>
                </View>
                <View style={[s.exBadge, h.type === 'full' ? s.exBadgeClosed : s.exBadgeSemi]}>
                  <Text style={[s.exBadgeText, { color: h.type === 'full' ? colors.error : '#92400E' }]}>
                    {h.type === 'full' ? 'סגור (ברירת מחדל)' : 'עד 14:00 (ברירת מחדל)'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* User-set exceptions */}
            {exceptions.map((ex) => {
              const hol = HOLIDAY_MAP.get(ex.date)
              return (
                <TouchableOpacity key={ex.date} style={[s.exCard, s.exCardOverride]}
                  onPress={() => openDay(ex.date)} activeOpacity={0.8}>
                  <Ionicons name="chevron-back" size={16} color={colors.placeholder} />
                  <View style={s.exInfo}>
                    <Text style={s.exDate}>{formatDateHe(ex.date)}</Text>
                    {hol && <Text style={s.exHolidayName}>{hol.nameHe}</Text>}
                    {!ex.isClosed && ex.breaks.length > 0 && (
                      <Text style={s.exNote}>
                        {ex.breaks.length === 1 ? 'הפסקה 1' : `${ex.breaks.length} הפסקות`}
                      </Text>
                    )}
                    {ex.note ? <Text style={s.exNote}>{ex.note}</Text> : null}
                  </View>
                  {ex.isClosed ? (
                    <View style={[s.exBadge, s.exBadgeClosed]}>
                      <Text style={[s.exBadgeText, { color: colors.error }]}>סגור</Text>
                    </View>
                  ) : (
                    <View style={[s.exBadge, s.exBadgeCustom]}>
                      <Text style={[s.exBadgeText, { color: '#92400E' }]}>
                        {ex.openTime} – {ex.closeTime}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* ── Regular hours (collapsible) ───────────────────── */}
        <View style={s.section}>
          <TouchableOpacity style={s.collapseHeader}
            onPress={() => setHoursExpanded((v) => !v)} activeOpacity={0.8}>
            <Ionicons name={hoursExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
            <Text style={s.collapseTitle}>שעות קבועות לכל שבוע</Text>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          {hoursExpanded && (
            <View style={s.collapseBody}>
              <Text style={s.sectionSub}>שעות ברירת מחדל — ניתנות לדריסה בלוח</Text>
              <WorkingHoursEditor hours={hours} onChange={setHours} />
              <Button label="שמרי שעות קבועות" onPress={handleSaveHours}
                loading={saving} style={s.saveBtn} />
            </View>
          )}
        </View>

      </ScrollView>

      {modalOpen && (
        <ExceptionModal
          date={selectedDate}
          existing={existingForSelected}
          holiday={holidayForSelected}
          onClose={() => { setModalOpen(false); setSelectedDate(null) }}
          onSave={handleSaveException}
          onDelete={handleDeleteException}
        />
      )}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title:  { fontSize: 17, fontWeight: '700', color: colors.text },
  scroll: { padding: 16, gap: 24, paddingBottom: 60 },

  section: { gap: 10 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: colors.text,
    textAlign: 'left', borderLeftWidth: 3, borderLeftColor: colors.primary, paddingLeft: 10,
  },
  hint:       { fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
  sectionSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  saveBtn:    { width: '100%', marginTop: 4 },

  legend:     { flexDirection: 'row-reverse', gap: 16 },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.textSecondary },

  calendar: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },

  exCard: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  exCardOverride: { borderColor: colors.primaryLight },
  exInfo:         { flex: 1 },
  exDate:         { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  exHolidayName:  { fontSize: 12, color: colors.primary, fontWeight: '600', textAlign: 'right', marginTop: 1 },
  exNote:         { fontSize: 12, color: colors.textSecondary, textAlign: 'right', marginTop: 1 },
  exBadge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 140 },
  exBadgeClosed:  { backgroundColor: '#FEE2E2' },
  exBadgeSemi:    { backgroundColor: '#FEF3C7' },
  exBadgeCustom:  { backgroundColor: colors.primaryFaint },
  exBadgeText:    { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  collapseHeader: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  collapseTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'right' },
  collapseBody:  { gap: 14 },
})

const ms = StyleSheet.create({
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheetScroll: { maxHeight: '92%' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, gap: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 4,
  },

  holidayBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    alignSelf: 'center', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  badgeFull:        { backgroundColor: '#FEE2E2' },
  badgeSemi:        { backgroundColor: '#FEF3C7' },
  holidayBadgeText: { fontSize: 13, fontWeight: '700' },

  holidayHint: {
    fontSize: 12, color: colors.textSecondary, textAlign: 'center',
    backgroundColor: colors.background, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },

  dateTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  row: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: colors.background, borderRadius: 12, padding: 14,
  },
  rowLabel:  { fontSize: 15, color: colors.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  timesRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dash:      { fontSize: 16, color: colors.placeholder, marginTop: 16 },
  breakRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10,
  },
  breakLabel:   { fontSize: 11, fontWeight: '600', color: '#B07D0A' },
  addBreakBtn:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 2 },
  addBreakText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  noteInput: {
    backgroundColor: colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text,
  },
  saveBtn:       { width: '100%' },
  deleteBtn:     { alignItems: 'center', paddingVertical: 8 },
  deleteBtnText: { fontSize: 14, color: colors.error, fontWeight: '600' },
  cancelBtn:     { alignItems: 'center', paddingVertical: 4 },
  cancelText:    { fontSize: 14, color: colors.placeholder },
})
