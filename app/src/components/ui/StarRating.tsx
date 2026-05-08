import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../theme/colors'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: number
  showCount?: boolean
}

export function StarRating({ rating, reviewCount, size = 14, showCount = true }: StarRatingProps) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.5
  const isNew = reviewCount === 0

  if (isNew) {
    return (
      <View style={styles.row}>
        <View style={[styles.newBadge, { paddingHorizontal: size * 0.6, paddingVertical: size * 0.2 }]}>
          <Text style={[styles.newText, { fontSize: size - 1 }]}>עסק חדש</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= full ? 'star' : hasHalf && star === full + 1 ? 'star-half' : 'star-outline'}
          size={size}
          color="#F5A623"
        />
      ))}
      <Text style={[styles.rating, { fontSize: size }]}>{rating.toFixed(1)}</Text>
      {showCount && reviewCount !== undefined && (
        <Text style={[styles.count, { fontSize: size - 1 }]}>({reviewCount})</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontWeight: '600',
    color: colors.text,
    marginEnd: 2,
  },
  count: {
    color: colors.textSecondary,
  },
  newBadge: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 6,
  },
  newText: {
    fontWeight: '700',
    color: colors.primary,
  },
})
