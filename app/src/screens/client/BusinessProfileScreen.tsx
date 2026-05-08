import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Share,
  TextInput,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { RootStackParamList } from '../../navigation/types'
import { BusinessDetail, ServiceItem } from '../../types/business'
import { fetchBusinessById } from '../../services/businessService'
import { useBookingStore } from '../../store/bookingStore'
import { ensureConversationWithBusiness } from '../../services/messagesService'
import { submitComplaint, COMPLAINT_REASONS } from '../../services/complaintsService'
import { PhotoGallery } from '../../components/ui/PhotoGallery'
import { StarRating } from '../../components/ui/StarRating'
import { Button } from '../../components/ui/Button'
import { colors } from '../../theme/colors'
import { formatPrice, formatDuration } from '../../utils/shabbat'

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessProfile'>

const AVATAR_PLACEHOLDER = 'https://ui-avatars.com/api/?background=F5EDF1&color=7D4E6B&size=80&name='

export default function BusinessProfileScreen({ route, navigation }: Props) {
  const { businessId } = route.params
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const setDraftField = useBookingStore((s) => s.setDraftField)
  const resetDraft = useBookingStore((s) => s.resetDraft)

  const [business, setBusiness] = useState<BusinessDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedStylist, setSelectedStylist] = useState<BusinessDetail['stylists'][0] | null>(null)

  useEffect(() => {
    fetchBusinessById(businessId)
      .then(setBusiness)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [businessId])

  function handleBookService(service: ServiceItem) {
    resetDraft()
    setDraftField('businessId', businessId)
    setDraftField('serviceId', service.id)
    navigation.navigate('StylistSelect', { businessId, serviceId: service.id })
  }

  function handleBookNow() {
    resetDraft()
    setDraftField('businessId', businessId)
    navigation.navigate('ServiceSelect', { businessId })
  }

  const [startingChat, setStartingChat] = useState(false)
  const [complaintOpen, setComplaintOpen] = useState(false)

  function handleCall() {
    if (business?.phone) Linking.openURL(`tel:${business.phone}`)
  }

  async function handleShare() {
    if (!business) return
    await Share.share({
      title: business.name,
      message: `${business.name}\n📍 ${business.address}\n📞 ${business.phone}`,
    })
  }

  async function handleMessage() {
    if (!business) return
    setStartingChat(true)
    try {
      const { conversationId } = await ensureConversationWithBusiness(business.id)
      navigation.navigate('Chat', { conversationId, otherName: business.name })
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לפתוח שיחה כרגע')
    } finally {
      setStartingChat(false)
    }
  }

  function handleGoogleMaps() {
    if (!business) return
    const query = encodeURIComponent(business.address)
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`
    Linking.openURL(url)
  }

  function handleWaze() {
    if (!business) return
    const query = encodeURIComponent(business.address)
    Linking.openURL(`waze://?q=${query}&navigate=yes`).catch(() => {
      Linking.openURL(`https://waze.com/ul?q=${query}&navigate=yes`)
    })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error || !business) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('errors.notFound')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Photo gallery */}
        <View>
          <PhotoGallery photos={business.photos} />
          <SafeAreaView style={styles.backButtonWrapper} edges={['top']}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-forward" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.topRightButtons}>
              <TouchableOpacity style={styles.overlayBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.overlayBtn} onPress={() => setComplaintOpen(true)}>
                <Ionicons name="flag-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>

          {/* Business info */}
          <View style={styles.infoSection}>
            <Text style={styles.businessName}>{business.name}</Text>
            <StarRating rating={business.rating} reviewCount={business.reviewCount} size={15} />
            {business.description && (
              <Text style={styles.description}>{business.description}</Text>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.metaText}>{business.address}</Text>
            </View>
            {/* Call + Message action row */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCall]} onPress={handleCall} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={17} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>התקשרי</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnMsg]} onPress={handleMessage}
                activeOpacity={0.8} disabled={startingChat}>
                {startingChat
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="chatbubble-outline" size={17} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>שלחי הודעה</Text>
                    </>
                }
              </TouchableOpacity>
            </View>

            {/* Navigation buttons */}
            <View style={styles.navRow}>
              <TouchableOpacity style={[styles.navBtn, styles.navBtnWaze]} onPress={handleWaze} activeOpacity={0.8}>
                <Text style={styles.navBtnEmoji}>🗺️</Text>
                <Text style={[styles.navBtnText, { color: '#00B4D8' }]}>Waze</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.navBtn, styles.navBtnMaps]} onPress={handleGoogleMaps} activeOpacity={0.8}>
                <Text style={styles.navBtnEmoji}>📍</Text>
                <Text style={[styles.navBtnText, { color: '#EA4335' }]}>Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('business.services')}</Text>
            {business.services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                onBook={() => handleBookService(service)}
              />
            ))}
            {business.services.length === 0 && (
              <Text style={styles.emptyText}>אין שירותים פעילים</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Work / Portfolio photos */}
          {(business.workPhotos?.length ?? 0) > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>גלריית עבודות</Text>
                <ScrollView horizontal inverted showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workPhotosList}>
                  {business.workPhotos.map((url) => (
                    <Image key={url} source={{ uri: url }} style={styles.workPhoto} />
                  ))}
                </ScrollView>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Stylists */}
          {business.stylists.length > 0 && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('business.stylists')}</Text>
                <View style={styles.stylistCards}>
                  {business.stylists.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.stylistCard}
                      activeOpacity={0.85}
                      onPress={() => setSelectedStylist(item)}
                    >
                      <Image
                        source={{ uri: item.photo ?? `${AVATAR_PLACEHOLDER}${item.name}` }}
                        style={styles.stylistCardAvatar}
                      />
                      <View style={styles.stylistCardInfo}>
                        <Text style={styles.stylistCardName}>{item.name}</Text>
                        {item.bio ? (
                          <Text style={styles.stylistCardBio} numberOfLines={2}>{item.bio}</Text>
                        ) : null}
                        {(item.specialties?.length ?? 0) > 0 && (
                          <View style={styles.stylistChips}>
                            {item.specialties.slice(0, 3).map((s) => (
                              <View key={s} style={styles.stylistChip}>
                                <Text style={styles.stylistChipText}>{s}</Text>
                              </View>
                            ))}
                            {item.specialties.length > 3 && (
                              <Text style={styles.stylistChipMore}>+{item.specialties.length - 3}</Text>
                            )}
                          </View>
                        )}
                        {item.instagram ? (
                          <TouchableOpacity
                            style={styles.instagramRow}
                            onPress={() => Linking.openURL(`https://instagram.com/${item.instagram!.replace('@', '')}`)}
                          >
                            <Ionicons name="logo-instagram" size={13} color="#C13584" />
                            <Text style={styles.instagramText}>{item.instagram}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Stylist detail modal */}
          <Modal
            visible={!!selectedStylist}
            animationType="slide"
            transparent
            onRequestClose={() => setSelectedStylist(null)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedStylist(null)}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
                {selectedStylist && (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Image
                      source={{ uri: selectedStylist.photo ?? `${AVATAR_PLACEHOLDER}${selectedStylist.name}` }}
                      style={styles.modalAvatar}
                    />
                    <Text style={styles.modalName}>{selectedStylist.name}</Text>
                    {selectedStylist.bio ? (
                      <Text style={styles.modalBio}>{selectedStylist.bio}</Text>
                    ) : null}
                    {(selectedStylist.specialties?.length ?? 0) > 0 && (
                      <View style={styles.modalChips}>
                        {selectedStylist.specialties.map((s) => (
                          <View key={s} style={styles.stylistChip}>
                            <Text style={styles.stylistChipText}>{s}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {selectedStylist.instagram ? (
                      <TouchableOpacity
                        style={[styles.instagramRow, { justifyContent: 'center', marginTop: 8 }]}
                        onPress={() => Linking.openURL(`https://instagram.com/${selectedStylist.instagram!.replace('@', '')}`)}
                      >
                        <Ionicons name="logo-instagram" size={16} color="#C13584" />
                        <Text style={[styles.instagramText, { fontSize: 14 }]}>{selectedStylist.instagram}</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.modalBookBtn}
                      onPress={() => {
                        setSelectedStylist(null)
                        resetDraft()
                        setDraftField('businessId', businessId)
                        navigation.navigate('ServiceSelect', { businessId })
                      }}
                    >
                      <Text style={styles.modalBookBtnText}>הזמני תור עם {selectedStylist.name}</Text>
                    </TouchableOpacity>
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>

          {/* Reviews */}
          {business.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('business.reviews') ?? 'ביקורות'}</Text>
              {business.reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString('he-IL')}
                    </Text>
                    <View style={styles.reviewMeta}>
                      <StarRating rating={review.rating} showCount={false} size={12} />
                      <Text style={styles.reviewerName}>{review.clientName}</Text>
                    </View>
                  </View>
                  {review.text && <Text style={styles.reviewText}>{review.text}</Text>}
                </View>
              ))}
            </View>
          )}

        </View>

        {/* Bottom padding so content isn't hidden behind sticky button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Complaint modal */}
      {business && (
        <ComplaintModal
          businessId={business.id}
          businessName={business.name}
          visible={complaintOpen}
          onClose={() => setComplaintOpen(false)}
        />
      )}

      {/* Sticky CTA */}
      <View style={[styles.stickyBottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Button
          label={t('business.bookNow')}
          onPress={handleBookNow}
          style={styles.bookButton}
        />
      </View>
    </View>
  )
}

// ─── Complaint Modal ──────────────────────────────────────────────────────────

function ComplaintModal({
  businessId, businessName, visible, onClose,
}: { businessId: string; businessName: string; visible: boolean; onClose: () => void }) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!selectedReason) {
      Alert.alert('נדרשת סיבה', 'אנא בחרי סיבה לפני השליחה')
      return
    }
    setSubmitting(true)
    try {
      await submitComplaint({ businessId, reason: selectedReason, description: description.trim() || undefined })
      Alert.alert('תלונה נשלחה', 'תלונתך התקבלה ותיבדק על ידי הנהלת האפליקציה. תודה.')
      setSelectedReason(null)
      setDescription('')
      onClose()
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'לא ניתן לשלוח את התלונה כרגע'
      Alert.alert('שגיאה', Array.isArray(msg) ? msg.join('\n') : String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cm.overlay}>
        <View style={cm.sheet}>
          <View style={cm.handle} />
          <View style={cm.headerRow}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={cm.title}>דיווח על {businessName}</Text>
          </View>

          <Text style={cm.label}>סיבת הדיווח</Text>
          {COMPLAINT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[cm.reasonRow, selectedReason === reason && cm.reasonRowSelected]}
              onPress={() => setSelectedReason(reason)}
              activeOpacity={0.8}
            >
              <View style={[cm.radio, selectedReason === reason && cm.radioSelected]}>
                {selectedReason === reason && <View style={cm.radioDot} />}
              </View>
              <Text style={[cm.reasonText, selectedReason === reason && cm.reasonTextSelected]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={[cm.label, { marginTop: 16 }]}>פרטים נוספים (אופציונלי)</Text>
          <TextInput
            style={cm.input}
            value={description}
            onChangeText={setDescription}
            placeholder="תארי את הבעיה..."
            placeholderTextColor={colors.placeholder}
            textAlign="right"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[cm.submitBtn, (!selectedReason || submitting) && cm.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={cm.submitBtnText}>שלחי דיווח</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Service Row ──────────────────────────────────────────────────────────────

function ServiceRow({ service, onBook }: { service: ServiceItem; onBook: () => void }) {
  return (
    <View style={styles.serviceRow}>
      <TouchableOpacity style={styles.serviceBookBtn} onPress={onBook}>
        <Text style={styles.serviceBookText}>הזמיני</Text>
      </TouchableOpacity>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{service.nameHe}</Text>
        <View style={styles.serviceMeta}>
          <Text style={styles.serviceDuration}>{formatDuration(service.durationMinutes)}</Text>
          <Text style={styles.serviceDot}>·</Text>
          <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 0 },
  errorText: { color: colors.textSecondary, fontSize: 16 },

  // Back button overlaid on photo
  backButtonWrapper: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightButtons: { flexDirection: 'row', gap: 8 },
  overlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { paddingHorizontal: 20 },

  // Info
  infoSection: { paddingVertical: 20, gap: 10 },
  businessName: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'left' },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: 'left', lineHeight: 22 },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.textSecondary, textAlign: 'left', flex: 1 },
  phone: { color: colors.primary },

  actionRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 2 },
  actionBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12,
  },
  actionBtnCall: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  actionBtnMsg:  { backgroundColor: colors.primary },
  actionBtnText: { fontSize: 14, fontWeight: '700' },

  navRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 2 },
  navBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  navBtnWaze: { borderColor: '#00B4D8', backgroundColor: '#E0F7FA' },
  navBtnMaps: { borderColor: '#EA4335', backgroundColor: '#FFF1F0' },
  navBtnEmoji: { fontSize: 15 },
  navBtnText: { fontSize: 13, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  // Section
  section: { paddingVertical: 20, gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
  emptyText: { color: colors.textSecondary, textAlign: 'left', fontSize: 14 },

  // Service row
  serviceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  serviceInfo: { flex: 1, gap: 4 },
  serviceName: { fontSize: 15, fontWeight: '600', color: colors.text, textAlign: 'left' },
  serviceMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
  serviceDuration: { fontSize: 13, color: colors.textSecondary },
  serviceDot: { fontSize: 13, color: colors.placeholder },
  serviceBookBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  serviceBookText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // Work photos
  workPhotosList: { gap: 10, paddingVertical: 4 },
  workPhoto: { width: 160, height: 160, borderRadius: 14 },

  // Stylists — card layout
  stylistCards: { gap: 12 },
  stylistCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stylistCardAvatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primaryFaint },
  stylistCardInfo: { flex: 1, gap: 6 },
  stylistCardName: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  stylistCardBio: { fontSize: 13, color: colors.textSecondary, textAlign: 'left', lineHeight: 19 },
  stylistChips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 5 },
  stylistChip: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stylistChipText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  stylistChipMore: { fontSize: 11, color: colors.placeholder, alignSelf: 'center' },
  instagramRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  instagramText: { fontSize: 12, color: '#C13584', fontWeight: '500' },

  // Stylist modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalClose: { alignSelf: 'flex-start', padding: 4, marginBottom: 12 },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    backgroundColor: colors.primaryFaint,
    marginBottom: 14,
  },
  modalName: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  modalBio: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  modalChips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 8 },
  modalBookBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalBookBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Reviews
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  reviewMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  reviewerName: { fontSize: 13, fontWeight: '600', color: colors.text },
  reviewDate: { fontSize: 11, color: colors.textSecondary },
  reviewText: { fontSize: 13, color: colors.text, textAlign: 'left', lineHeight: 20 },

  // Report button (overlaid on photo, opposite corner to back button)
  // (defined above in backButtonWrapper section)

  // Sticky bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 28,
  },
  bookButton: { width: '100%' },
})

const cm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48, gap: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 8,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'right' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'right' },
  reasonRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background,
  },
  reasonRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  reasonText: { flex: 1, fontSize: 14, color: colors.text, textAlign: 'right' },
  reasonTextSelected: { color: colors.primary, fontWeight: '600' },
  input: {
    backgroundColor: colors.background, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.text, minHeight: 80, textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.error, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
