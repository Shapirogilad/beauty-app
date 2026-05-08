import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { RootStackParamList } from '../../navigation/types'
import {
  fetchAdminBusinesses, fetchPendingBusinesses,
  approveBusiness, rejectBusiness,
  AdminBusiness, PendingBusiness,
} from '../../services/adminService'
import { colors } from '../../theme/colors'

type Nav = NativeStackNavigationProp<RootStackParamList>

const CATEGORY_LABELS: Record<string, string> = {
  hair: 'שיער', nails: 'ציפורניים', manicure: 'מניקור', laser: 'לייזר',
  waxing: 'שעווה', eyebrows: 'גבות', eyelashes: 'ריסים', facial: 'פנים',
  massage: 'עיסוי', makeup: 'איפור',
}

function formatILS(agorot: number) {
  return `₪${(agorot / 100).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`
}

export default function AdminBusinessesScreen() {
  const nav = useNavigation<Nav>()
  const [tab, setTab] = useState<'approved' | 'pending'>('approved')
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [pending, setPending] = useState<PendingBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (q?: string) => {
    try {
      const [biz, pend] = await Promise.all([fetchAdminBusinesses(q), fetchPendingBusinesses()])
      setBusinesses(biz)
      setPending(pend)
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function handleSearch(text: string) {
    setSearch(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(text || undefined), 400)
  }

  function confirmApprove(b: PendingBusiness) {
    Alert.alert('אישור עסק', `לאשר את "${b.name}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'אשר', onPress: async () => {
        setActing(b.id)
        try { await approveBusiness(b.id); setPending((p) => p.filter((x) => x.id !== b.id)) }
        finally { setActing(null) }
      }},
    ])
  }

  function confirmReject(b: PendingBusiness) {
    Alert.alert('דחיית עסק', `לדחות את "${b.name}"?`, [
      { text: 'ביטול', style: 'cancel' },
      { text: 'דחה', style: 'destructive', onPress: async () => {
        setActing(b.id)
        try { await rejectBusiness(b.id); setPending((p) => p.filter((x) => x.id !== b.id)) }
        finally { setActing(null) }
      }},
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>עסקים</Text>
      </View>

      {/* Segmented control */}
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'approved' && styles.segBtnActive]}
          onPress={() => setTab('approved')}
        >
          <Text style={[styles.segText, tab === 'approved' && styles.segTextActive]}>
            מאושרים ({businesses.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'pending' && styles.segBtnActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.segText, tab === 'pending' && styles.segTextActive]}>
            ממתינים {pending.length > 0 ? `(${pending.length})` : ''}
          </Text>
          {pending.length > 0 && <View style={styles.dot} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : tab === 'approved' ? (
        <>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.placeholder} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={handleSearch}
              placeholder="חיפוש לפי שם, כתובת, בעלים..."
              placeholderTextColor={colors.placeholder}
              textAlign="right"
              clearButtonMode="while-editing"
            />
          </View>
          <FlatList
            data={businesses}
            keyExtractor={(b) => b.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search || undefined) }} />}
            ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו עסקים</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.bizCard}
                activeOpacity={0.8}
                onPress={() => nav.navigate('AdminBusinessDetail', { businessId: item.id, businessName: item.name })}
              >
                <View style={styles.bizTop}>
                  <View style={styles.bizIcon}>
                    <Ionicons name="storefront" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.bizInfo}>
                    <Text style={styles.bizName}>{item.name}</Text>
                    <Text style={styles.bizSub}>{item.owner.name} · {item.address}</Text>
                    <Text style={styles.bizSub}>{item.category.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')}</Text>
                  </View>
                  <View style={styles.bizRight}>
                    <Text style={styles.bizDate}>{format(new Date(item.createdAt), 'dd/MM/yy')}</Text>
                    <Ionicons name="chevron-back" size={16} color={colors.placeholder} />
                  </View>
                </View>
                <View style={styles.bizStats}>
                  <View style={styles.bizStat}>
                    <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.bizStatText}>{item.bookingCount} הזמנות</Text>
                  </View>
                  <View style={styles.bizStat}>
                    <Ionicons name="cash-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.bizStatText}>{formatILS(item.revenueAgorot)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              <Text style={styles.emptyText}>אין בקשות ממתינות</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.pendingCard}>
              <View style={styles.bizTop}>
                <View style={styles.bizIcon}>
                  <Ionicons name="time-outline" size={20} color="#F59E0B" />
                </View>
                <View style={styles.bizInfo}>
                  <Text style={styles.bizName}>{item.name}</Text>
                  <Text style={styles.bizSub}>{item.owner.name} · {item.owner.phone}</Text>
                  {item.owner.email && <Text style={styles.bizSub}>{item.owner.email}</Text>}
                  <Text style={styles.bizSub}>{item.address}</Text>
                  <Text style={styles.bizSub}>{item.category.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')}</Text>
                </View>
                <Text style={styles.bizDate}>{format(new Date(item.createdAt), 'dd/MM/yy')}</Text>
              </View>
              {acting === item.id ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => confirmReject(item)}>
                    <Ionicons name="close" size={15} color={colors.error} />
                    <Text style={[styles.actionText, { color: colors.error }]}>דחה</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => confirmApprove(item)}>
                    <Ionicons name="checkmark" size={15} color="#fff" />
                    <Text style={[styles.actionText, { color: '#fff' }]}>אשר</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'left' },
  segment: {
    flexDirection: 'row-reverse', marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderRadius: 12, padding: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  segBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 9 },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  segTextActive: { color: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F59E0B' },
  searchBar: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    margin: 12, backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 14, paddingTop: 4, gap: 10, paddingBottom: 30 },
  emptyText: { textAlign: 'center', color: colors.placeholder, paddingTop: 40, fontSize: 15 },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 12 },
  bizCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  pendingCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1.5, borderColor: '#F59E0B40',
  },
  bizTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  bizIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryFaint, alignItems: 'center', justifyContent: 'center',
  },
  bizInfo: { flex: 1, gap: 2 },
  bizName: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  bizSub: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  bizRight: { alignItems: 'flex-end', gap: 4 },
  bizDate: { fontSize: 11, color: colors.placeholder },
  bizStats: { flexDirection: 'row-reverse', gap: 16, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.border },
  bizStat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  bizStatText: { fontSize: 12, color: colors.textSecondary },
  actions: { flexDirection: 'row-reverse', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 10,
  },
  approveBtn: { backgroundColor: colors.primary },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: colors.error },
  actionText: { fontSize: 13, fontWeight: '700' },
})
