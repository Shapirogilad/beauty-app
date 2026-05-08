import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'
import { ServiceCategory } from '../../types/business'
import { colors } from '../../theme/colors'

const CATEGORY_META: Record<ServiceCategory, { emoji: string; label: string }> = {
  hair:     { emoji: '✂️', label: 'שיער' },
  nails:    { emoji: '💅', label: 'ציפורניים' },
  manicure: { emoji: '🪮', label: 'מניקור' },
  laser:    { emoji: '⚡', label: 'לייזר' },
  waxing:   { emoji: '🌿', label: 'שעווה' },
  eyebrows: { emoji: '🤎', label: 'גבות' },
  lashes:   { emoji: '👁️', label: 'ריסים' },
  facial:   { emoji: '🧖', label: 'טיפול פנים' },
  massage:  { emoji: '💆', label: 'עיסוי' },
  makeup:   { emoji: '💄', label: 'איפור' },
}

interface CategoryCardProps {
  category: ServiceCategory
  selected?: boolean
  onPress: (category: ServiceCategory) => void
  style?: ViewStyle
}

export function CategoryCard({ category, selected = false, onPress, style }: CategoryCardProps) {
  const { emoji, label } = CATEGORY_META[category]

  return (
    <TouchableOpacity
      onPress={() => onPress(category)}
      activeOpacity={0.75}
      style={[styles.card, selected && styles.selected, style]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </TouchableOpacity>
  )
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as ServiceCategory[]

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: 80,
  },
  selected: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  selectedLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
})
