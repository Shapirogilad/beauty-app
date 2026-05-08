import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { RootStackParamList } from '../../navigation/types'
import {
  fetchAdminClient, fetchAdminBusinesses,
  adminCreditLoyalty, adminDeleteUser,
  AdminClientDetail, AdminBusiness,
} from '../../services/adminService'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'AdminClientDetail'>

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'ממתין', CONFIRMED: 'מאושר', CANCELLED: 'בוטל',
  COMPLETED: 'הושלם', NO_SHOW: 'לא הגיע',
}

function formatILS(agorot: number) {
  return `₪${(agorot / 100).toFixed(0)}`
}

export default function AdminClientDetailScreen({ route }: Props) {
  const nav = useNavigation()
  const { clientId } = route.params

  const [client, setClient] = useState<AdminClientDetail | null>(null)
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [loading, setLoading] = useState(true)

  // Credit modal state
  const [creditVisible, setCreditVisible] = useState(false)
  const [selectedBizId, setSelectedBizId] = useState('')
  const [creditPoints, setCreditPoints] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [crediting, setCrediting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [c, biz] = await Promise.all([fetchAdminClient(clientId), fetchAdminBusinesses()])
      setClient(c)
      setBusinesses(biz)
      if (biz.length > 0) setSelectedBizId(biz[0].id)
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון פרטי לקוח')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleCredit() {
    const pts = parseInt(creditPoints, 10)
    if (!selectedBizId || !pts || pts <= 0) return
    setCrediting(true)
    try {
      await adminCreditLoyalty(clientId, selectedBizId, pts, creditNote || undefined)
      Alert.alert('בוצע', `${pts} נקודות נוספו בהצלחה`)
      setCreditVisible(false)
      setCreditPoints('')
      setCreditNote('')
      load()
    } catch {
      Alert.alert('שגיאה', 'הענקת הנקודות נכשלה')
    } finally {
      setCrediting(false)
    }
  }

  function handleDelete() {
    Alert.alert(
      'מחיקת לקוח',
      `למחוק את ${client?.name}? פעולה זו בלתי הפיכה.`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק', style: 'destructive',
          onPress: async () => {
            try {
              await adminDeleteUser(clientId)
              nav.goBack()
            } catch {
              Alert.alert('שגיאה', 'מחיקת המשתמש נכשלה')
            }
          },
        },
      ],
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    )
  }

  if (!client) return null

  const selectedBiz = businesses.find((b) => b.id === selectedBizId)
  const loyaltyTotal = client.loyaltyAccounts.reduce((s, a) => s + a.points, 0)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{client.name}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{client.name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{client.name}</Text>
              <Text style={styles.profileSub}>{client.phone}</Text>
              {client.email ? <Text style={styles.profileSub}>{client.email}</Text> : null}
              {client.city ? <Text style={styles.profileSub}>{client.city}</Text> : null}
              <Text style={styles.profileSub}>
                הצטרף: {format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: he })}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{client.bookings.length}</Text>
            <Text style={styles.statLbl}>הזמנות</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{formatILS(client.totalSpentAgorot)}</Text>
            <Text style={styles.statLbl}>סה"כ הוצאה</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{loyaltyTotal}</Text>
            <Text style={styles.statLbl}>נקודות</Text>
          </View>
        </View>

        {/* Loyalty accounts */}
        {client.loyaltyAccounts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>יתרת קרדיט</Text>
            {client.loyaltyAccounts.map((acc) => (
              <View key={acc.business.id} style={styles.loyaltyRow}>
                <Text style={styles.loyaltyBiz}>{acc.business.name}</Text>
                <Text style={styles.loyaltyPts}>{acc.points} נק'</Text>
              </View>
            ))}
          </View>
        )}

        {/* Credit button */}
        <TouchableOpacity style={styles.creditBtn} onPress={() => setCreditVisible(true)}>
          <Ionicons name="gift-outline" size={20} color="#fff" />
          <Text style={styles.creditBtnText}>הענק קרדיט ללקוח</Text>
        </TouchableOpacity>

        {/* Recent bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>הזמנות אחרונות</Text>
          {client.bookings.length === 0 ? (
            <Text style={styles.emptyText}>אין הזמנות</Text>
          ) : (
            client.bookings.map((b) => (
              <View key={b.id} style={styles.bookingRow}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingService}>{b.service.nameHe}</Text>
                  <Text style={styles.bookingMeta}>
                    {b.stylist.business.name} · {b.stylist.name}
                  </Text>
                  <Text style={styles.bookingDate}>
                    {format(new Date(b.startAt), 'dd/MM/yy HH:mm', { locale: he })}
                  </Text>
                </View>
                <View style={styles.bookingRight}>
                  <Text style={styles.bookingPrice}>{formatILS(b.service.price)}</Text>
                  <Text style={styles.bookingStatus}>{STATUS_LABEL[b.status] ?? b.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Credit Modal */}
      <Modal visible={creditVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>הענקת קרדיט</Text>
            <Text style={styles.modalSub}>ללקוח: {client.name}</Text>

            <Text style={styles.inputLabel}>עסק</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bizPicker}>
              {businesses.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.bizChip, selectedBizId === b.id && styles.bizChipActive]}
                  onPress={() => setSelectedBizId(b.id)}
                >
                  <Text style={[styles.bizChipText, selectedBizId === b.id && styles.bizChipTextActive]}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>מספר נקודות</Text>
            <TextInput
              style={styles.modalInput}
              value={creditPoints}
              onChangeText={setCreditPoints}
              keyboardType="number-pad"
              placeholder="לדוגמה: 100"
              placeholderTextColor={colors.placeholder}
              textAlign="right"
            />

            <Text style={styles.inputLabel}>הערה (אופציונלי)</Text>
            <TextInput
              style={styles.modalInput}
              value={creditNote}
              onChangeText={setCreditNote}
              placeholder="סיבת ההענקה..."
              placeholderTextColor={colors.placeholder}
              textAlign="right"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreditVisible(false)}>
                <Text style={styles.cancelBtnText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, (!selectedBizId || !creditPoints) && styles.confirmBtnDisabled]}
                onPress={handleCredit}
                disabled={!selectedBizId || !creditPoints || crediting}
              >
                {crediting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.confirmBtnText}>הענק</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileRow: { flexDirection: 'row-reverse', gap: 14, alignItems: 'flex-start' },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '700', color: colors.primary },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'left' },
  profileSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'left' },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLbl: { fontSize: 11, color: colors.textSecondary },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  loyaltyRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryFaint,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  loyaltyBiz: { fontSize: 14, fontWeight: '600', color: colors.text },
  loyaltyPts: { fontSize: 14, fontWeight: '700', color: colors.primary },
  creditBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  creditBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  emptyText: { color: colors.placeholder, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  bookingRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingInfo: { flex: 1, gap: 2 },
  bookingService: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'left' },
  bookingMeta: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  bookingDate: { fontSize: 11, color: colors.placeholder, textAlign: 'left' },
  bookingRight: { alignItems: 'flex-end', gap: 4 },
  bookingPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
  bookingStatus: { fontSize: 11, color: colors.textSecondary },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  modalSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: -8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'left' },
  bizPicker: { flexDirection: 'row' },
  bizChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 8,
  },
  bizChipActive: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  bizChipText: { fontSize: 13, color: colors.text },
  bizChipTextActive: { color: colors.primary, fontWeight: '700' },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
})
