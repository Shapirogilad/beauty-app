import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../../theme/colors'

interface TimeSlotGridProps {
  slots: string[]          // ISO strings
  selectedSlot: string | null
  onSelect: (slot: string) => void
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function TimeSlotGrid({ slots, selectedSlot, onSelect }: TimeSlotGridProps) {
  if (slots.length === 0) {
    return <Text style={styles.empty}>אין זמנות פנויים ביום זה</Text>
  }

  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const isSelected = slot === selectedSlot
        return (
          <TouchableOpacity
            key={slot}
            style={[styles.slot, isSelected && styles.slotSelected]}
            onPress={() => onSelect(slot)}
            activeOpacity={0.8}
          >
            <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
              {formatTime(slot)}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  slot: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  slotSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  slotText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  slotTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 24,
    fontSize: 14,
  },
})
