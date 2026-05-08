import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BusinessSummary } from '../../types/business'
import { colors } from '../../theme/colors'

interface SalonCardProps {
  business: BusinessSummary
  onPress: (id: string) => void
  variant?: 'horizontal' | 'vertical'
  style?: ViewStyle
}

const PLACEHOLDER = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'

export function SalonCard({ business, onPress, variant = 'horizontal', style }: SalonCardProps) {
  const isHorizontal = variant === 'horizontal'

  return (
    <TouchableOpacity
      onPress={() => onPress(business.id)}
      activeOpacity={0.9}
      style={[styles.card, isHorizontal ? styles.cardHorizontal : styles.cardVertical, style]}
    >
      <Image
        source={{ uri: business.photos[0] ?? PLACEHOLDER }}
        style={isHorizontal ? styles.photoHorizontal : styles.photoVertical}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{business.name}</Text>

        <View style={styles.row}>
          <View style={styles.ratingRow}>
            {business.reviewCount === 0 ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>חדש</Text>
              </View>
            ) : (
              <>
                <Ionicons name="star" size={12} color="#F5A623" />
                <Text style={styles.rating}>{business.rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({business.reviewCount})</Text>
              </>
            )}
          </View>

          {business.distanceKm !== undefined && (
            <Text style={styles.distance}>
              {business.distanceKm < 1
                ? `${Math.round(business.distanceKm * 1000)} מ׳`
                : `${business.distanceKm.toFixed(1)} ק״מ`}
            </Text>
          )}
        </View>

        <Text style={styles.address} numberOfLines={1}>{business.address}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHorizontal: {
    width: 200,
  },
  cardVertical: {
    flexDirection: 'row-reverse',
    width: '100%',
  },
  photoHorizontal: {
    width: '100%',
    height: 130,
  },
  photoVertical: {
    width: 90,
    height: 90,
  },
  info: {
    padding: 10,
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  reviewCount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  newBadge: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  distance: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  address: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'left',
  },
})
