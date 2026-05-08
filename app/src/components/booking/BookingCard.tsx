import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format, differenceInHours, isPast } from 'date-fns'
import { he } from 'date-fns/locale'
import { BookingItem, BookingStatus } from '../../types/booking'
import { formatPrice } from '../../utils/shabbat'
import { colors } from '../../theme/colors'

const AVATAR_PLACEHOLDER = 'https://ui-avatars.com/api/?background=F5EDF1&color=7D4E6B&size=80&name='

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  PENDING:              { label: 'ממתין לתשלום', color: '#B07D0A', bg: '#FFF8E1' },
  CONFIRMED:            { label: 'מאושר',         color: '#2E7D32', bg: '#E8F5E9' },
  CANCELLED:            { label: 'בוטל - יוחזר',  color: '#C62828', bg: '#FFEBEE' },
  CANCELLED_NO_REFUND:  { label: 'בוטל',          color: '#C62828', bg: '#FFEBEE' },
  COMPLETED:            { label: 'בוצע',           color: '#6B6B6B', bg: '#F5F5F5' },
  NO_SHOW:              { label: 'לא הגיעה',       color: '#6B6B6B', bg: '#F5F5F5' },
}

interface BookingCardProps {
  booking: BookingItem
  onCancel?: (id: string) => void
  onRebook?: (booking: BookingItem) => void
  onReview?: (booking: BookingItem) => void
  onReschedule?: (booking: BookingItem) => void
  onPress?: (id: string) => void
}

export function BookingCard({ booking, onCancel, onRebook, onReview, onReschedule, onPress }: BookingCardProps) {
  const startDate = new Date(booking.startAt)
  const endDate = new Date(booking.endAt)
  const isUpcoming = !isPast(startDate)
  const hoursUntil = differenceInHours(startDate, new Date())
  const canRequest = isUpcoming && ['PENDING', 'CONFIRMED'].includes(booking.status) && hoursUntil > 0
  const hasPendingRequest = !!booking.pendingChangeRequest
  const isPast_ = isPast(endDate)
  const meta = STATUS_META[booking.status]

  const dateLabel = format(startDate, "EEE, d בMMMM", { locale: he })
  const timeLabel = `${format(startDate, 'HH:mm')} – ${format(endDate, 'HH:mm')}`

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(booking.id)}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {/* Stylist avatar + info */}
      <View style={styles.top}>
        <View style={styles.statusBadge(meta.bg)}>
          <Text style={styles.statusText(meta.color)}>{meta.label}</Text>
        </View>
        <View style={styles.topRight}>
          <Image
            source={{ uri: booking.stylist.photo ?? `${AVATAR_PLACEHOLDER}${booking.stylist.name}` }}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={styles.serviceName}>{booking.service.nameHe}</Text>
            <Text style={styles.stylistName}>{booking.stylist.name}</Text>
          </View>
        </View>
      </View>

      {/* Date / time / price */}
      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Text style={styles.metaValue}>{formatPrice(booking.service.price)}</Text>
          <Text style={styles.metaLabel}>עלות</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaRow}>
          <Text style={styles.metaValue}>{timeLabel}</Text>
          <Text style={styles.metaLabel}>שעה</Text>
        </View>
        <View style={styles.metaDivider} />
        <View style={styles.metaRow}>
          <Text style={styles.metaValue}>{dateLabel}</Text>
          <Text style={styles.metaLabel}>תאריך</Text>
        </View>
      </View>

      {/* Pending request badge */}
      {hasPendingRequest && (
        <View style={styles.pendingRequestBadge}>
          <Ionicons name="time-outline" size={14} color="#7B5EA7" />
          <Text style={styles.pendingRequestText}>
            {booking.pendingChangeRequest!.type === 'CANCEL_REFUND'
              ? 'בקשת ביטול בטיפול'
              : 'בקשת שינוי מועד בטיפול'}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isPast_ && (booking.status === 'COMPLETED' || booking.status === 'CONFIRMED') && !booking.review && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.reviewBtn]}
            onPress={() => onReview?.(booking)}
          >
            <Ionicons name="star-outline" size={16} color="#F5A623" />
            <Text style={[styles.actionText, { color: '#F5A623' }]}>דרגי את החוויה</Text>
          </TouchableOpacity>
        )}
        {isPast_ && (booking.status === 'COMPLETED' || booking.status === 'CONFIRMED') && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onRebook?.(booking)}
          >
            <Ionicons name="repeat" size={16} color={colors.primary} />
            <Text style={styles.actionText}>הזמיני שוב</Text>
          </TouchableOpacity>
        )}
        {canRequest && !hasPendingRequest && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rescheduleBtn]}
              onPress={() => onReschedule?.(booking)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.actionText}>שינוי מועד</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => onCancel?.(booking.id)}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>בקשת ביטול</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  top: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFaint,
  },
  info: { flex: 1, gap: 3 },
  serviceName: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  stylistName: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  statusBadge: (bg: string) => ({
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: bg,
    alignSelf: 'flex-start',
  }),
  statusText: (color: string) => ({
    fontSize: 11,
    fontWeight: '600',
    color,
  }),
  meta: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 0,
  },
  metaRow: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metaLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  metaValue: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
  metaDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 4 },
  pendingRequestBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3EEF9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pendingRequestText: { fontSize: 12, color: '#7B5EA7', fontWeight: '600', flex: 1, textAlign: 'left' },
  actions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cancelBtn: {
    borderColor: colors.error,
  },
  rescheduleBtn: {
    borderColor: colors.primary,
  },
  reviewBtn: {
    borderColor: '#F5A623',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
})
