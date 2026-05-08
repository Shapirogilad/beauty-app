import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { RootStackParamList } from '../../navigation/types'
import { useBookingStore } from '../../store/bookingStore'
import { createBooking, chargeCard, chargeWithSavedCard, fetchSavedCards, payWithWalletOnly, fetchServicePrice } from '../../services/bookingsService'
import { fetchMe } from '../../services/authService'
import { validatePromo, getLoyaltyAccount, previewRedemption, PromoValidation, RedemptionPreview } from '../../services/growthService'
import { CardInput, CardData } from '../../components/ui/CardInput'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'
import { formatPrice } from '../../utils/shabbat'

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirm'>

export default function BookingConfirmScreen({ route, navigation }: Props) {
  const { stylistId, serviceId, slotStart } = route.params
  const draft = useBookingStore((s) => s.draft)
  const resetDraft = useBookingStore((s) => s.resetDraft)

  const [savedCards, setSavedCards] = useState<{ id: string; last4: string; expiry: string }[]>([])
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string | null>(null)
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [cardValid, setCardValid] = useState(false)
  const [saveCard, setSaveCard] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Promo
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<PromoValidation | null>(null)
  const [promoError, setPromoError] = useState('')

  // Wallet
  const [walletBalance, setWalletBalance] = useState(0)   // agorot
  const [servicePrice, setServicePrice] = useState(0)     // agorot
  const [useWallet, setUseWallet] = useState(false)

  // Loyalty
  const [loyaltyBalance, setLoyaltyBalance] = useState(0)
  const [useLoyalty, setUseLoyalty] = useState(false)
  const [loyaltyPreview, setLoyaltyPreview] = useState<RedemptionPreview | null>(null)

  const businessId = draft?.businessId ?? ''
  const slotDate = new Date(slotStart)
  const dateLabel = format(slotDate, "EEEE, d בMMMM 'בשעה' HH:mm", { locale: he })

  // Load saved cards, wallet balance, and service price on mount
  useEffect(() => {
    fetchSavedCards()
      .then((cards) => {
        setSavedCards(cards)
        if (cards.length > 0) setSelectedSavedCardId(cards[0].id)
      })
      .catch(() => {})
    fetchMe()
      .then((me) => setWalletBalance(me.walletBalance ?? 0))
      .catch(() => {})
    fetchServicePrice(serviceId)
      .then((svc) => setServicePrice(svc.price))
      .catch(() => {})
  }, [])

  // Load loyalty balance on mount
  useEffect(() => {
    if (!businessId) return
    getLoyaltyAccount(businessId)
      .then((acc) => setLoyaltyBalance(acc.points))
      .catch(() => {})
  }, [businessId])

  // Preview loyalty redemption when toggled on
  useEffect(() => {
    if (!useLoyalty || !businessId || loyaltyBalance === 0) {
      setLoyaltyPreview(null)
      return
    }
    previewRedemption(businessId, loyaltyBalance)
      .then(setLoyaltyPreview)
      .catch(() => {})
  }, [useLoyalty, businessId, loyaltyBalance])

  async function handleApplyPromo() {
    if (!promoCode.trim()) return
    setPromoError('')
    setPromoResult(null)
    setPromoLoading(true)
    try {
      const result = await validatePromo(promoCode.trim(), businessId, serviceId, 0)
      setPromoResult(result)
    } catch (e: any) {
      setPromoError(e?.response?.data?.message ?? 'קוד לא תקין')
    } finally {
      setPromoLoading(false)
    }
  }

  function removePromo() {
    setPromoResult(null)
    setPromoCode('')
    setPromoError('')
  }

  const walletCovers = Math.min(walletBalance, servicePrice)
  const walletFullyCovered = useWallet && walletBalance >= servicePrice
  const needsCard = !walletFullyCovered

  async function handlePay() {
    if (needsCard && !selectedSavedCardId && (!cardData || !cardValid)) return
    setError('')
    setLoading(true)
    try {
      const booking = await createBooking({
        stylistId,
        serviceId,
        slotStart,
        promoId: promoResult?.promoId,
        loyaltyPointsToRedeem: useLoyalty ? (loyaltyPreview?.toRedeem ?? 0) : 0,
      })
      if (walletFullyCovered) {
        await payWithWalletOnly(booking.id)
      } else if (selectedSavedCardId) {
        await chargeWithSavedCard(booking.id, selectedSavedCardId, useWallet)
      } else {
        await chargeCard({
          bookingId: booking.id,
          ccno: cardData!.ccno,
          expdate: cardData!.expdate,
          cvv: cardData!.cvv,
          saveCard,
          useWallet,
        })
      }
      resetDraft()
      navigation.replace('BookingSuccess', {
        bookingId: booking.id,
        startAt: booking.startAt,
        endAt: booking.endAt,
        businessName: booking.stylist?.business?.name,
        businessAddress: booking.stylist?.business?.address,
        serviceName: booking.service?.nameHe,
        stylistName: booking.stylist?.name,
      })
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'שגיאה בתשלום, נסי שוב')
    } finally {
      setLoading(false)
    }
  }

  const hasDiscount = promoResult || (useLoyalty && loyaltyPreview && loyaltyPreview.discountAgorot > 0)

  return (
    <KeyboardAvoidingView
      style={styles.kavFlex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>אישור הזמנה</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Booking summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>סיכום הזמנה</Text>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.summaryText}>{dateLabel}</Text>
          </View>
          {hasDiscount && (
            <View style={[styles.summaryRow, styles.discountRow]}>
              <Ionicons name="pricetag-outline" size={16} color={colors.success} />
              <Text style={styles.discountText}>
                הנחה:{' '}
                {promoResult ? formatPrice(promoResult.discountAgorot) : ''}
                {useLoyalty && loyaltyPreview && loyaltyPreview.discountAgorot > 0
                  ? `${promoResult ? ' + ' : ''}נקודות (${formatPrice(loyaltyPreview.discountAgorot)})`
                  : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Cancellation notice */}
        <View style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.noticeText}>ביטול עד 24 שעות לפני — החזר כספי מלא</Text>
        </View>

        {/* Promo code */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>קוד הנחה</Text>
          {promoResult ? (
            <View style={styles.promoApplied}>
              <View style={styles.promoAppliedLeft}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <View>
                  <Text style={styles.promoAppliedCode}>{promoResult.code}</Text>
                  <Text style={styles.promoAppliedDiscount}>
                    הנחה: {formatPrice(promoResult.discountAgorot)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={removePromo}>
                <Ionicons name="close-circle" size={22} color={colors.placeholder} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="הכניסי קוד..."
                placeholderTextColor={colors.placeholder}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                textAlign="left"
              />
              <TouchableOpacity
                style={[styles.promoApplyBtn, !promoCode.trim() && styles.promoApplyBtnDisabled]}
                onPress={handleApplyPromo}
                disabled={!promoCode.trim() || promoLoading}
              >
                {promoLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.promoApplyText}>החלי</Text>
                }
              </TouchableOpacity>
            </View>
          )}
          {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
        </View>

        {/* Wallet balance */}
        {walletBalance > 0 && (
          <View style={styles.walletBox}>
            <View style={styles.walletTop}>
              <View style={styles.walletRight}>
                <Text style={styles.walletTitle}>יתרת ארנק</Text>
                <Text style={styles.walletBalance}>
                  ₪{(walletBalance / 100).toFixed(2)} זמינים
                </Text>
              </View>
              <Switch
                value={useWallet}
                onValueChange={setUseWallet}
                trackColor={{ true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            {useWallet && (
              <Text style={styles.walletSaving}>
                {walletFullyCovered
                  ? 'הארנק מכסה את כל העסקה — לא נדרש כרטיס'
                  : `הארנק יכסה ₪${(walletCovers / 100).toFixed(2)} — נשאר לתשלום ₪${((servicePrice - walletCovers) / 100).toFixed(2)}`}
              </Text>
            )}
          </View>
        )}

        {/* Loyalty points */}
        {loyaltyBalance > 0 && (
          <View style={styles.loyaltyBox}>
            <View style={styles.loyaltyTop}>
              <View style={styles.loyaltyRight}>
                <Text style={styles.loyaltyTitle}>נקודות נאמנות</Text>
                <Text style={styles.loyaltyBalance}>יתרה: {loyaltyBalance} נקודות</Text>
              </View>
              <Switch
                value={useLoyalty}
                onValueChange={setUseLoyalty}
                trackColor={{ true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            {useLoyalty && loyaltyPreview && loyaltyPreview.discountAgorot > 0 && (
              <Text style={styles.loyaltySaving}>
                חיסכון: {formatPrice(loyaltyPreview.discountAgorot)} ({loyaltyPreview.toRedeem} נקודות)
              </Text>
            )}
          </View>
        )}

        {/* Payment section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי תשלום</Text>

          {walletFullyCovered ? (
            <View style={styles.walletCoveredBox}>
              <Ionicons name="wallet" size={22} color={colors.primary} />
              <Text style={styles.walletCoveredText}>תשלום מלא מהארנק — לא נדרש כרטיס</Text>
            </View>
          ) : (
            <>
              {/* Saved cards */}
              {savedCards.length > 0 && (
                <View style={styles.savedCardsBox}>
                  {savedCards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={[styles.savedCardRow, selectedSavedCardId === card.id && styles.savedCardRowActive]}
                      onPress={() => setSelectedSavedCardId(card.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={selectedSavedCardId === card.id ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selectedSavedCardId === card.id ? colors.primary : colors.placeholder}
                      />
                      <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
                      <Text style={styles.savedCardText}>•••• {card.last4}</Text>
                      <Text style={styles.savedCardExpiry}>{card.expiry}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.savedCardRow, !selectedSavedCardId && styles.savedCardRowActive]}
                    onPress={() => setSelectedSavedCardId(null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={!selectedSavedCardId ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={!selectedSavedCardId ? colors.primary : colors.placeholder}
                    />
                    <Text style={styles.savedCardText}>כרטיס חדש</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* New card form — shown only when no saved card selected */}
              {!selectedSavedCardId && (
                <>
                  <CardInput onChange={(data, valid) => { setCardData(data); setCardValid(valid) }} />
                  <View style={styles.saveRow}>
                    <Switch
                      value={saveCard}
                      onValueChange={setSaveCard}
                      trackColor={{ true: colors.primary }}
                      thumbColor="#fff"
                    />
                    <Text style={styles.saveLabel}>שמרי כרטיס לתשלומים עתידיים</Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

      </ScrollView>

      <View style={styles.bottom}>
        <Button
          label={walletFullyCovered ? 'שלמי מהארנק ואשרי' : 'שלמי ואשרי הזמנה'}
          onPress={handlePay}
          disabled={needsCard && !selectedSavedCardId && !cardValid}
          loading={loading}
          style={styles.payButton}
        />
      </View>
    </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  kavFlex: { flex: 1, backgroundColor: colors.background },
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
  content: { padding: 20, gap: 20 },
  summaryCard: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, textAlign: 'left' },
  summaryRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  discountRow: { backgroundColor: '#EDF7F1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  discountText: { fontSize: 14, color: colors.success, fontWeight: '600', flex: 1, textAlign: 'left' },
  summaryText: { fontSize: 14, color: colors.text, textAlign: 'left', flex: 1 },
  noticeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: { fontSize: 13, color: colors.textSecondary, flex: 1, textAlign: 'left', lineHeight: 20 },
  section: { gap: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'left' },
  promoRow: { flexDirection: 'row-reverse', gap: 10 },
  promoInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    letterSpacing: 1,
  },
  promoApplyBtn: {
    height: 48,
    paddingHorizontal: 18,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyBtnDisabled: { opacity: 0.4 },
  promoApplyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  promoApplied: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EDF7F1',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#B2DFCA',
  },
  promoAppliedLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  promoAppliedCode: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  promoAppliedDiscount: { fontSize: 13, color: colors.success, textAlign: 'left' },
  promoError: { fontSize: 13, color: colors.error, textAlign: 'left', marginTop: -8 },
  walletBox: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  walletTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  walletRight: { gap: 2 },
  walletTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, textAlign: 'left' },
  walletBalance: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  walletSaving: { fontSize: 14, color: colors.success, fontWeight: '600', textAlign: 'left' },
  walletCoveredBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primaryFaint,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  walletCoveredText: { fontSize: 15, fontWeight: '600', color: colors.primary, flex: 1, textAlign: 'left' },
  loyaltyBox: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  loyaltyTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  loyaltyRight: { gap: 2 },
  loyaltyTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, textAlign: 'left' },
  loyaltyBalance: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  loyaltySaving: { fontSize: 14, color: colors.success, fontWeight: '600', textAlign: 'left' },
  saveRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  saveLabel: { fontSize: 14, color: colors.text, flex: 1, textAlign: 'left' },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: 14, textAlign: 'center' },
  bottom: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  payButton: { width: '100%' },
  savedCardsBox: {
    gap: 8,
  },
  savedCardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  savedCardRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  savedCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    textAlign: 'left',
  },
  savedCardExpiry: {
    fontSize: 13,
    color: colors.textSecondary,
  },
})
