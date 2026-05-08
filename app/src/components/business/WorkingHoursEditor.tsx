import React, { useRef, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  Modal, ScrollView, Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { WorkingHoursEntry, DayBreak } from '../../types/businessOwner'
import { colors } from '../../theme/colors'

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

const ITEM_H       = 48
const VISIBLE      = 5
const PICKER_H     = ITEM_H * VISIBLE

// ─── DrumRoll ────────────────────────────────────────────────────────────────

function DrumRoll({ items, selected, onSelect, width = 68 }: {
  items: string[]
  selected: string
  onSelect: (v: string) => void
  width?: number
}) {
  const ref = useRef<ScrollView>(null)
  const idx = Math.max(0, items.indexOf(selected))

  // Scroll to selected item when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: idx * ITEM_H, animated: false })
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  function onScrollEnd(e: any) {
    const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
    const clamped = Math.max(0, Math.min(i, items.length - 1))
    onSelect(items[clamped])
  }

  return (
    <View style={[drumStyles.container, { width }]}>
      {/* Highlight bar */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { justifyContent: 'center' }]}>
        <View style={drumStyles.highlight} />
      </View>

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        nestedScrollEnabled
      >
        {items.map((item, i) => (
          <TouchableOpacity
            key={item}
            style={drumStyles.item}
            onPress={() => {
              ref.current?.scrollTo({ y: i * ITEM_H, animated: true })
              onSelect(item)
            }}
            activeOpacity={0.6}
          >
            <Text style={[drumStyles.itemText, item === selected && drumStyles.itemTextSelected]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const drumStyles = StyleSheet.create({
  container: { height: PICKER_H, overflow: 'hidden' },
  highlight: {
    height: ITEM_H,
    backgroundColor: colors.primaryFaint,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 22, color: colors.placeholder, fontWeight: '400' },
  itemTextSelected: { fontSize: 24, color: colors.primary, fontWeight: '700' },
})

// ─── TimePicker ──────────────────────────────────────────────────────────────

export function TimePicker({ value, onChange, label }: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const parts = value.split(':')
  const [hour,   setHour]   = useState(parts[0] ?? '09')
  const [minute, setMinute] = useState(
    // snap to nearest valid minute
    MINUTES.includes(parts[1]) ? parts[1] : '00',
  )

  function confirm() {
    onChange(`${hour}:${minute}`)
    setOpen(false)
  }

  function handleOpen() {
    const p = value.split(':')
    setHour(p[0] ?? '09')
    setMinute(MINUTES.includes(p[1]) ? p[1] : '00')
    setOpen(true)
  }

  return (
    <>
      <TouchableOpacity style={styles.timeButton} onPress={handleOpen} activeOpacity={0.75}>
        <Text style={styles.timeButtonText}>{value}</Text>
        <Text style={styles.timeButtonLabel}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.modalBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>בחרי שעה</Text>

            <View style={styles.drumRow}>
              <DrumRoll items={HOURS}   selected={hour}   onSelect={setHour}   width={72} />
              <Text style={styles.colon}>:</Text>
              <DrumRoll items={MINUTES} selected={minute} onSelect={setMinute} width={72} />
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
              <Text style={styles.confirmText}>אישור</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

// ─── WorkingHoursEditor ──────────────────────────────────────────────────────

interface Props {
  hours: WorkingHoursEntry[]
  onChange: (hours: WorkingHoursEntry[]) => void
}

export function WorkingHoursEditor({ hours, onChange }: Props) {
  function updateDay(dayOfWeek: number, patch: Partial<WorkingHoursEntry>) {
    onChange(hours.map((h) => h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h))
  }

  function addBreak(dayOfWeek: number) {
    const entry = hours.find((h) => h.dayOfWeek === dayOfWeek)!
    updateDay(dayOfWeek, { breaks: [...entry.breaks, { start: '13:00', end: '14:00' }] })
  }

  function removeBreak(dayOfWeek: number, index: number) {
    const entry = hours.find((h) => h.dayOfWeek === dayOfWeek)!
    updateDay(dayOfWeek, { breaks: entry.breaks.filter((_, i) => i !== index) })
  }

  function updateBreak(dayOfWeek: number, index: number, patch: Partial<DayBreak>) {
    const entry = hours.find((h) => h.dayOfWeek === dayOfWeek)!
    updateDay(dayOfWeek, {
      breaks: entry.breaks.map((b, i) => i === index ? { ...b, ...patch } : b),
    })
  }

  return (
    <View style={styles.container}>
      {hours.map((entry) => (
        <View key={entry.dayOfWeek} style={[styles.dayCard, entry.isClosed && styles.dayCardClosed]}>

          {/* Day header */}
          <View style={styles.dayHeader}>
            <Switch
              value={!entry.isClosed}
              onValueChange={(v) => updateDay(entry.dayOfWeek, { isClosed: !v })}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
            <Text style={[styles.dayName, entry.isClosed && styles.dayNameClosed]}>
              {DAY_NAMES[entry.dayOfWeek]}
            </Text>
            {entry.isClosed && <Text style={styles.closedLabel}>סגור</Text>}
          </View>

          {!entry.isClosed && (
            <>
              {/* Open / Close times */}
              <View style={styles.timesRow}>
                <TimePicker
                  value={entry.closeTime}
                  onChange={(v) => updateDay(entry.dayOfWeek, { closeTime: v })}
                  label="סגירה"
                />
                <Text style={styles.dashText}>—</Text>
                <TimePicker
                  value={entry.openTime}
                  onChange={(v) => updateDay(entry.dayOfWeek, { openTime: v })}
                  label="פתיחה"
                />
              </View>

              {/* Breaks */}
              {entry.breaks.map((brk, idx) => (
                <View key={idx} style={styles.breakRow}>
                  <TouchableOpacity
                    onPress={() => removeBreak(entry.dayOfWeek, idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>

                  <View style={styles.breakTimes}>
                    <TimePicker
                      value={brk.end}
                      onChange={(v) => updateBreak(entry.dayOfWeek, idx, { end: v })}
                      label="חזרה"
                    />
                    <Text style={styles.dashText}>—</Text>
                    <TimePicker
                      value={brk.start}
                      onChange={(v) => updateBreak(entry.dayOfWeek, idx, { start: v })}
                      label="הפסקה"
                    />
                  </View>

                  <Text style={styles.breakIndex}>הפסקה {idx + 1}</Text>
                </View>
              ))}

              {/* Add break */}
              <TouchableOpacity style={styles.addBreakBtn} onPress={() => addBreak(entry.dayOfWeek)} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.addBreakLabel}>הוספת הפסקה</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: 10 },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCardClosed: { opacity: 0.5 },
  dayHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  dayName: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'left' },
  dayNameClosed: { color: colors.placeholder },
  closedLabel: { fontSize: 12, color: colors.placeholder, fontStyle: 'italic' },

  timesRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dashText: { fontSize: 16, color: colors.placeholder, marginTop: 16 },

  timeButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    gap: 2,
  },
  timeButtonText: { fontSize: 18, fontWeight: '700', color: colors.text },
  timeButtonLabel: { fontSize: 10, color: colors.textSecondary },

  breakRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 10,
  },
  breakIndex: { fontSize: 11, fontWeight: '600', color: '#B07D0A' },
  breakTimes: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flex: 1 },

  addBreakBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  addBreakLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: 280,
    alignItems: 'center',
    gap: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  drumRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  colon: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 4 },
  confirmBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
})
