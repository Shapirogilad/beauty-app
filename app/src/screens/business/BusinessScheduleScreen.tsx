import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Linking, Pressable, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { addDays, format, isSameDay, isToday, isSaturday } from 'date-fns'
import { he } from 'date-fns/locale'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/types'
import { fetchSchedule, confirmBooking, cancelBookingByOwner, issueRefundByOwner, markNoShow, fetchBusinessWaitlist } from '../../services/businessOwnerService'
import { fetchPendingChangeRequests, approveChangeRequest, declineChangeRequest } from '../../services/bookingsService'
import { ensureConversation } from '../../services/messagesService'
import { useAuthStore } from '../../store/authStore'

type Nav = NativeStackNavigationProp<RootStackParamList>
import { ScheduleBooking } from '../../types/businessOwner'
import { ConfirmSheet } from '../../components/ui/ConfirmSheet'
import { formatPrice } from '../../utils/shabbat'
import { colors } from '../../theme/colors'

const DAYS_RANGE = 14

function buildDates(): Date[] {
  return Array.from({ length: DAYS_RANGE }, (_, i) => addDays(new Date(), i - 3))
    .filter((d) => !isSaturday(d))
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED:           { label: 'מאושר',        color: '#2E7D32', bg: '#E8F5E9' },
  PENDING:             { label: 'ממתין',         color: '#B07D0A', bg: '#FFF8E1' },
  COMPLETED:           { label: 'בוצע',          color: '#6B6B6B', bg: '#F5F5F5' },
  CANCELLED:           { label: 'בוטל – הוחזר',  color: '#C62828', bg: '#FFEBEE' },
  CANCELLED_NO_REFUND: { label: 'בוטל – לא הוחזר', color: '#C62828', bg: '#FFEBEE' },
  NO_SHOW:             { label: 'לא הגיע/ה',     color: '#C62828', bg: '#FFEBEE' },
}

type WaitlistEntry = {
  id: string
  client: { id: string; name: string; phone: string }
  service: { id: string; nameHe: string }
}

type ServiceGroup = {
  serviceId: string
  nameHe: string
  entries: WaitlistEntry[]
}

type ChangeRequest = {
  id: string
  type: 'CANCEL_REFUND' | 'RESCHEDULE'
  status: string
  proposedStart: string | null
  note: string | null
  createdAt: string
  booking: {
    id: string
    startAt: string
    client: { name: string; phone: string }
    service: { nameHe: string }
    stylist: { name: string }
  }
}

export default function BusinessScheduleScreen() {
  const nav = useNavigation<Nav>()
  const dates = buildDates()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'schedule' | 'waitlist' | 'requests'>('schedule')

  // Schedule state
  const [bookings, setBookings] = useState<ScheduleBooking[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionTarget, setActionTarget] = useState<{ booking: ScheduleBooking; type: 'confirm' | 'noshow' | 'cancel' | 'refund' } | null>(null)
  const [actioning, setActioning] = useState(false)

  // Waitlist state
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loadingWaitlist, setLoadingWaitlist] = useState(false)
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null)

  // Change requests state
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [requestActioning, setRequestActioning] = useState<string | null>(null)
  const businessUser = useAuthStore((s) => s.user)
  const [callerModal, setCallerModal] = useState<{
    name: string; phone: string; clientId: string; serviceName: string; date: Date
  } | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)

  const loadSchedule = useCallback(async (date: Date, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoadingSchedule(true)
    try {
      const data = await fetchSchedule(format(date, 'yyyy-MM-dd'))
      setBookings(data)
    } finally {
      setLoadingSchedule(false)
      setRefreshing(false)
    }
  }, [])

  const loadWaitlist = useCallback(async (date: Date) => {
    setLoadingWaitlist(true)
    try {
      const data = await fetchBusinessWaitlist(format(date, 'yyyy-MM-dd'))
      setWaitlist(data)
    } finally {
      setLoadingWaitlist(false)
    }
  }, [])

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true)
    try {
      const data = await fetchPendingChangeRequests()
      setChangeRequests(data)
    } catch {
      setChangeRequests([])
    } finally {
      setLoadingRequests(false)
    }
  }, [])

  React.useEffect(() => {
    loadSchedule(selectedDate)
    loadWaitlist(selectedDate)
    loadRequests()
  }, [])

  function handleDateSelect(date: Date) {
    setSelectedDate(date)
    setExpandedServiceId(null)
    loadSchedule(date)
    loadWaitlist(date)
  }

  function handleTabChange(tab: 'schedule' | 'waitlist' | 'requests') {
    setActiveTab(tab)
    if (tab === 'requests') loadRequests()
  }

  async function handleApproveRequest(requestId: string) {
    setRequestActioning(requestId)
    try {
      await approveChangeRequest(requestId)
      setChangeRequests((prev) => prev.filter((r) => r.id !== requestId))
      loadSchedule(selectedDate)
    } catch (e: any) {
      Alert.alert('שגיאה', e?.response?.data?.message ?? 'לא ניתן לאשר את הבקשה')
    } finally {
      setRequestActioning(null)
    }
  }

  async function handleDeclineRequest(requestId: string) {
    setRequestActioning(requestId)
    try {
      await declineChangeRequest(requestId)
      setChangeRequests((prev) => prev.filter((r) => r.id !== requestId))
    } finally {
      setRequestActioning(null)
    }
  }

  async function handleAction() {
    if (!actionTarget) return
    setActioning(true)
    try {
      if (actionTarget.type === 'confirm')       await confirmBooking(actionTarget.booking.id)
      else if (actionTarget.type === 'cancel')   await cancelBookingByOwner(actionTarget.booking.id)
      else if (actionTarget.type === 'refund')   await issueRefundByOwner(actionTarget.booking.id)
      else                                        await markNoShow(actionTarget.booking.id)
      setActionTarget(null)
      loadSchedule(selectedDate)
    } finally {
      setActioning(false)
    }
  }

  // Group waitlist entries by service
  const serviceGroups: ServiceGroup[] = waitlist.reduce<ServiceGroup[]>((acc, entry) => {
    const existing = acc.find((g) => g.serviceId === entry.service.id)
    if (existing) {
      existing.entries.push(entry)
    } else {
      acc.push({ serviceId: entry.service.id, nameHe: entry.service.nameHe, entries: [entry] })
    }
    return acc
  }, [])

  const hourBlocks = generateHourBlocks(bookings)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
                <View style={[styles.todayDot, selected && styles.todayDotSelected]} />
              )}
            </TouchableOpacity>
          )
        }}
      />

      <Text style={styles.dayTitle}>
        {format(selectedDate, "EEEE, d בMMMM", { locale: he })}
      </Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => handleTabChange('schedule')}
        >
          <Text style={[styles.tabLabel, activeTab === 'schedule' && styles.tabLabelActive]}>תורים</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'waitlist' && styles.tabActive]}
          onPress={() => handleTabChange('waitlist')}
        >
          <Text style={[styles.tabLabel, activeTab === 'waitlist' && styles.tabLabelActive]}>המתנה</Text>
          {waitlist.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{waitlist.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => handleTabChange('requests')}
        >
          <Text style={[styles.tabLabel, activeTab === 'requests' && styles.tabLabelActive]}>בקשות</Text>
          {changeRequests.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{changeRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Schedule tab */}
      {activeTab === 'schedule' && (
        loadingSchedule ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.timeline}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSchedule(selectedDate, true)} tintColor={colors.primary} />}
          >
            {hourBlocks.length === 0 ? (
              <View style={styles.emptyDay}>
                <Ionicons name="calendar-outline" size={40} color={colors.primaryLight} />
                <Text style={styles.emptyText}>אין תורים ביום זה</Text>
              </View>
            ) : (
              hourBlocks.map((block) => (
                <ScheduleBlock
                  key={block.booking.id}
                  block={block}
                  onConfirm={() => setActionTarget({ booking: block.booking, type: 'confirm' })}
                  onNoShow={() => setActionTarget({ booking: block.booking, type: 'noshow' })}
                  onCancel={() => setActionTarget({ booking: block.booking, type: 'cancel' })}
                  onRefund={() => setActionTarget({ booking: block.booking, type: 'refund' })}
                />
              ))
            )}
          </ScrollView>
        )
      )}

      {/* Waitlist tab */}
      {activeTab === 'waitlist' && (
        loadingWaitlist ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <ScrollView contentContainerStyle={styles.waitlistContent} showsVerticalScrollIndicator={false}>
            {serviceGroups.length === 0 ? (
              <View style={styles.emptyDay}>
                <Ionicons name="time-outline" size={40} color={colors.primaryLight} />
                <Text style={styles.emptyText}>אין לקוחות ברשימת המתנה ליום זה</Text>
              </View>
            ) : (
              serviceGroups.map((group) => {
                const expanded = expandedServiceId === group.serviceId
                return (
                  <View key={group.serviceId} style={styles.serviceCard}>
                    {/* Service header */}
                    <TouchableOpacity
                      style={styles.serviceHeader}
                      onPress={() => setExpandedServiceId(expanded ? null : group.serviceId)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.primary}
                      />
                      <View style={styles.serviceHeaderCenter}>
                        <Text style={styles.serviceName}>{group.nameHe}</Text>
                        <Text style={styles.serviceCount}>{group.entries.length} ממתינות</Text>
                      </View>
                      <View style={styles.serviceCountBadge}>
                        <Text style={styles.serviceCountBadgeText}>{group.entries.length}</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Name chips */}
                    {expanded && (
                      <View style={styles.chipsWrap}>
                        {group.entries.map((entry) => (
                          <TouchableOpacity
                            key={entry.id}
                            style={styles.nameChip}
                            onPress={() => setCallerModal({
                              name: entry.client.name,
                              phone: entry.client.phone,
                              clientId: entry.client.id,
                              serviceName: group.nameHe,
                              date: selectedDate,
                            })}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="person-outline" size={14} color={colors.primary} />
                            <Text style={styles.nameChipText}>{entry.client.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </ScrollView>
        )
      )}

      {/* Requests tab */}
      {activeTab === 'requests' && (
        loadingRequests ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <ScrollView contentContainerStyle={styles.waitlistContent} showsVerticalScrollIndicator={false}>
            {changeRequests.length === 0 ? (
              <View style={styles.emptyDay}>
                <Ionicons name="checkmark-done-outline" size={40} color={colors.primaryLight} />
                <Text style={styles.emptyText}>אין בקשות פתוחות</Text>
              </View>
            ) : (
              changeRequests.map((req) => {
                const bookingDate = format(new Date(req.booking.startAt), "d בMMMM 'בשעה' HH:mm", { locale: he })
                const proposedDate = req.proposedStart
                  ? format(new Date(req.proposedStart), "d בMMMM 'בשעה' HH:mm", { locale: he })
                  : null
                const isActioning = requestActioning === req.id
                return (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <View style={[styles.requestTypeBadge, req.type === 'CANCEL_REFUND' ? styles.cancelBadge : styles.rescheduleBadge]}>
                        <Ionicons
                          name={req.type === 'CANCEL_REFUND' ? 'close-circle-outline' : 'calendar-outline'}
                          size={13}
                          color={req.type === 'CANCEL_REFUND' ? colors.error : colors.primary}
                        />
                        <Text style={[styles.requestTypeText, { color: req.type === 'CANCEL_REFUND' ? colors.error : colors.primary }]}>
                          {req.type === 'CANCEL_REFUND' ? 'בקשת ביטול עם החזר' : 'בקשת שינוי מועד'}
                        </Text>
                      </View>
                      <Text style={styles.requestClient}>{req.booking.client.name}</Text>
                    </View>
                    <Text style={styles.requestDetail}>{req.booking.service.nameHe} · {req.booking.stylist.name}</Text>
                    <Text style={styles.requestDetail}>תור נוכחי: {bookingDate}</Text>
                    {proposedDate && (
                      <Text style={styles.requestProposed}>מועד מוצע: {proposedDate}</Text>
                    )}
                    {req.note && (
                      <Text style={styles.requestNote}>"{req.note}"</Text>
                    )}
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.reqBtn, styles.reqDeclineBtn]}
                        onPress={() => handleDeclineRequest(req.id)}
                        disabled={isActioning}
                      >
                        {isActioning ? <ActivityIndicator size="small" color={colors.error} /> : (
                          <>
                            <Ionicons name="close" size={15} color={colors.error} />
                            <Text style={[styles.reqBtnText, { color: colors.error }]}>דחי</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.reqBtn, styles.reqApproveBtn]}
                        onPress={() => handleApproveRequest(req.id)}
                        disabled={isActioning}
                      >
                        {isActioning ? <ActivityIndicator size="small" color="#fff" /> : (
                          <>
                            <Ionicons name="checkmark" size={15} color="#fff" />
                            <Text style={[styles.reqBtnText, { color: '#fff' }]}>אשרי</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })
            )}
          </ScrollView>
        )
      )}

      {/* Confirm / no-show sheet */}
      {actionTarget && (
        <ConfirmSheet
          visible={!!actionTarget}
          title={
            actionTarget.type === 'confirm' ? 'אישור תור'
            : actionTarget.type === 'cancel' ? 'ביטול תור'
            : actionTarget.type === 'refund' ? 'החזר כספי'
            : 'סימון כ"לא הגיע/ה"'
          }
          message={
            actionTarget.type === 'confirm'
              ? `לאשר את התור של ${actionTarget.booking.client.name}?`
              : actionTarget.type === 'cancel'
              ? `לבטל את התור של ${actionTarget.booking.client.name}? הלקוחה תקבל התראה.`
              : actionTarget.type === 'refund'
              ? `להחזיר ל${actionTarget.booking.client.name} את סכום התשלום (₪${((actionTarget.booking.payment?.amountAgorot ?? 0) / 100).toFixed(2)})?`
              : `לסמן את ${actionTarget.booking.client.name} כמי שלא הגיע/ה?`
          }
          confirmLabel={
            actionTarget.type === 'confirm' ? 'אשרי'
            : actionTarget.type === 'cancel' ? 'בטלי תור'
            : actionTarget.type === 'refund' ? 'החזירי כסף'
            : 'סמני'
          }
          destructive={actionTarget.type !== 'confirm'}
          onConfirm={handleAction}
          onCancel={() => setActionTarget(null)}
          loading={actioning}
        />
      )}

      {/* Caller modal */}
      <Modal
        visible={!!callerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setCallerModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCallerModal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalName}>{callerModal?.name}</Text>
            <Text style={styles.modalPhone}>{callerModal?.phone}</Text>

            {/* Call */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success }]}
              onPress={() => {
                if (callerModal?.phone) Linking.openURL(`tel:${callerModal.phone}`)
              }}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>חייגי</Text>
            </TouchableOpacity>

            {/* WhatsApp */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
              onPress={() => {
                if (!callerModal) return
                const intlPhone = callerModal.phone.replace(/^0/, '972').replace(/[-\s]/g, '')
                const msg = encodeURIComponent(
                  `שלום ${callerModal.name}! יש לנו מקום פנוי ל${callerModal.serviceName}. האם תרצי לקבוע תור? 😊`
                )
                Linking.openURL(`https://wa.me/${intlPhone}?text=${msg}`)
              }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            {/* In-app message */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              disabled={sendingMessage}
              onPress={async () => {
                if (!callerModal) return
                setSendingMessage(true)
                try {
                  const { conversationId } = await ensureConversation(callerModal.clientId)
                  const dayName = format(callerModal.date, 'EEEE', { locale: he })
                  const dateStr = format(callerModal.date, "d בMMMM", { locale: he })
                  const draft = `שלום ${callerModal.name}, יש לנו מקום פנוי ל${callerModal.serviceName} ב${dayName} ${dateStr} בשעה . האם תרצי לקבוע תור?`
                  setCallerModal(null)
                  nav.navigate('Chat', { conversationId, otherName: callerModal.name, draftMessage: draft })
                } catch (e: any) {
                  const msg = e?.response?.data?.message ?? e?.message ?? 'לא ניתן לשלוח הודעה כרגע'
                  Alert.alert('שגיאה', Array.isArray(msg) ? msg.join('\n') : String(msg))
                } finally {
                  setSendingMessage(false)
                }
              }}
            >
              {sendingMessage
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              }
              <Text style={styles.actionBtnText}>הודעה באפליקציה</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCallerModal(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>סגירה</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

interface HourBlock { booking: ScheduleBooking; heightUnits: number }

function generateHourBlocks(bookings: ScheduleBooking[]): HourBlock[] {
  return [...bookings]
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .map((b) => {
      const mins = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 60_000
      return { booking: b, heightUnits: Math.max(1, Math.round(mins / 30)) }
    })
}

function ScheduleBlock({ block, onConfirm, onNoShow, onCancel, onRefund }: {
  block: HourBlock
  onConfirm: () => void
  onNoShow: () => void
  onCancel: () => void
  onRefund: () => void
}) {
  const { booking } = block
  const start = new Date(booking.startAt)
  const end = new Date(booking.endAt)
  const meta = STATUS_META[booking.status] ?? STATUS_META.CONFIRMED
  const canConfirm = booking.status === 'PENDING'
  const canNoShow  = booking.status === 'CONFIRMED' && new Date() > start
  const canCancel  = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const canRefund  = booking.status === 'CANCELLED_NO_REFUND' && booking.payment?.status === 'COMPLETED'

  const paymentPaid    = booking.payment?.status === 'COMPLETED'
  const paymentRefunded = booking.payment?.status === 'REFUNDED'
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'CANCELLED_NO_REFUND'

  return (
    <View style={styles.block}>
      <View style={styles.timeCol}>
        <Text style={styles.blockTime}>{format(start, 'HH:mm')}</Text>
        <Text style={styles.blockTimeEnd}>{format(end, 'HH:mm')}</Text>
      </View>
      <View style={[styles.blockContent, { borderLeftColor: meta.color }]}>
        <View style={styles.blockTop}>
          <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <View style={styles.blockTitles}>
            <Text style={styles.clientName}>{booking.client.name}</Text>
            <Text style={styles.serviceName2}>{booking.service.nameHe}</Text>
            <Text style={styles.stylistName}>{booking.stylist.name}</Text>
          </View>
        </View>

        {/* Payment / refund info row for cancelled bookings */}
        {isCancelled && booking.payment && (
          <View style={styles.paymentRow}>
            <Ionicons
              name={paymentRefunded ? 'checkmark-circle' : 'alert-circle'}
              size={14}
              color={paymentRefunded ? colors.success : colors.error}
            />
            <Text style={[styles.paymentText, { color: paymentRefunded ? colors.success : colors.error }]}>
              {paymentRefunded
                ? `הוחזר ₪${(booking.payment.amountAgorot / 100).toFixed(2)}`
                : paymentPaid
                ? `לא הוחזר — שולם ₪${(booking.payment.amountAgorot / 100).toFixed(2)}`
                : 'לא בוצע תשלום'
              }
            </Text>
          </View>
        )}

        <View style={styles.blockBottom}>
          <Text style={styles.priceText}>{formatPrice(booking.service.price)}</Text>
          <View style={styles.blockActions}>
            {canRefund && (
              <TouchableOpacity style={[styles.blockActionBtn, styles.refundBtn]} onPress={onRefund}>
                <Ionicons name="return-down-back-outline" size={15} color="#7B3FB5" />
                <Text style={[styles.blockActionText, { color: '#7B3FB5' }]}>החזר כספי</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity style={styles.blockActionBtn} onPress={onCancel}>
                <Ionicons name="close-circle-outline" size={15} color={colors.error} />
                <Text style={[styles.blockActionText, { color: colors.error }]}>ביטול</Text>
              </TouchableOpacity>
            )}
            {canNoShow && (
              <TouchableOpacity style={styles.blockActionBtn} onPress={onNoShow}>
                <Ionicons name="person-remove-outline" size={15} color={colors.error} />
                <Text style={[styles.blockActionText, { color: colors.error }]}>לא הגיע/ה</Text>
              </TouchableOpacity>
            )}
            {canConfirm && (
              <TouchableOpacity style={[styles.blockActionBtn, styles.confirmBtn]} onPress={onConfirm}>
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} />
                <Text style={[styles.blockActionText, { color: colors.success }]}>אשרי</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dateStrip: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 56,
    gap: 4,
  },
  dateChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateDay: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  dateDaySelected: { color: 'rgba(255,255,255,0.8)' },
  dateNum: { fontSize: 18, fontWeight: '700', color: colors.text },
  dateNumSelected: { color: '#fff' },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary },
  todayDotSelected: { backgroundColor: '#fff' },
  dayTitle: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'left', paddingHorizontal: 20, marginBottom: 4 },
  loader: { marginTop: 40 },

  // Tabs
  tabs: {
    flexDirection: 'row-reverse',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: '#fff' },
  tabBadge: {
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Schedule
  timeline: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  emptyDay: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  block: { flexDirection: 'row-reverse', gap: 10 },
  timeCol: { width: 44, alignItems: 'center', paddingTop: 4, gap: 4 },
  blockTime: { fontSize: 13, fontWeight: '700', color: colors.text },
  blockTimeEnd: { fontSize: 11, color: colors.textSecondary },
  blockContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    gap: 12,
  },
  blockTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  blockTitles: { flex: 1, gap: 2 },
  clientName: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  serviceName2: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  stylistName: { fontSize: 12, color: colors.primary, textAlign: 'left' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  blockBottom: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  paymentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  paymentText: { fontSize: 12, fontWeight: '600' },
  blockActions: { flexDirection: 'row-reverse', gap: 8 },
  blockActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  confirmBtn: { borderColor: colors.success },
  refundBtn:  { borderColor: '#7B3FB5' },
  blockActionText: { fontSize: 12, fontWeight: '600' },

  // Waitlist
  waitlistContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  serviceHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  serviceHeaderCenter: { flex: 1, gap: 2 },
  serviceName: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  serviceCount: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  serviceCountBadge: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  serviceCountBadgeText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  chipsWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  nameChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryFaint,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  nameChipText: { fontSize: 14, fontWeight: '600', color: colors.primary },

  // Change requests
  requestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  requestHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  requestClient: { fontSize: 15, fontWeight: '700', color: colors.text },
  requestTypeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  cancelBadge: { backgroundColor: '#FFF0F0', borderColor: '#FFCDD2' },
  rescheduleBadge: { backgroundColor: colors.primaryFaint, borderColor: colors.primaryLight },
  requestTypeText: { fontSize: 12, fontWeight: '600' },
  requestDetail: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  requestProposed: { fontSize: 13, color: colors.primary, fontWeight: '600', textAlign: 'left' },
  requestNote: { fontSize: 13, color: colors.text, fontStyle: 'italic', textAlign: 'left' },
  requestActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 },
  reqBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  reqApproveBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
  reqDeclineBtn: { borderColor: colors.error },
  reqBtnText: { fontSize: 14, fontWeight: '700' },

  // Caller modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  modalName: { fontSize: 20, fontWeight: '800', color: colors.text },
  modalPhone: { fontSize: 18, color: colors.textSecondary, letterSpacing: 1 },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  modalClose: { marginTop: 4 },
  modalCloseText: { fontSize: 14, color: colors.placeholder },
})
