import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { fetchAdminComplaints, updateComplaintStatus, Complaint } from '../../services/complaintsService'
import { colors } from '../../theme/colors'

const STATUS_LABEL: Record<string, string> = {
  OPEN:      'פתוחה',
  REVIEWED:  'נבדקה',
  DISMISSED: 'נדחתה',
}

const STATUS_COLOR: Record<string, string> = {
  OPEN:      '#EF4444',
  REVIEWED:  '#F59E0B',
  DISMISSED: colors.placeholder,
}

const FILTER_OPTIONS = [
  { label: 'הכל',   value: undefined },
  { label: 'פתוחות', value: 'OPEN' },
  { label: 'נבדקו',  value: 'REVIEWED' },
  { label: 'נדחו',   value: 'DISMISSED' },
]

export default function AdminComplaintsScreen() {
  const nav = useNavigation()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setComplaints(await fetchAdminComplaints(filter))
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לטעון תלונות')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function promptStatusChange(item: Complaint) {
    const options = ['OPEN', 'REVIEWED', 'DISMISSED'].filter((s) => s !== item.status)
    Alert.alert(
      'עדכון סטטוס',
      `שנה סטטוס תלונה של ${item.client.name} על ${item.business.name}`,
      [
        ...options.map((s) => ({
          text: STATUS_LABEL[s],
          onPress: () => changeStatus(item.id, s),
        })),
        { text: 'ביטול', style: 'cancel' as const },
      ],
    )
  }

  async function changeStatus(id: string, status: string) {
    setUpdatingId(id)
    try {
      const updated = await updateComplaintStatus(id, status)
      setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, status: updated.status } : c))
    } catch {
      Alert.alert('שגיאה', 'עדכון נכשל')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>תלונות</Text>
      </View>

      {/* Filter pills */}
      <View style={styles.filters}>
        {FILTER_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.filterPill, filter === opt.value && styles.filterPillActive]}
            onPress={() => setFilter(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === opt.value && styles.filterTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={56} color={colors.border} />
          <Text style={styles.emptyText}>אין תלונות</Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => promptStatusChange(item)} activeOpacity={0.8}>
              {/* Status badge */}
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>

              {/* Business + client */}
              <View style={styles.cardRow}>
                <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.cardBusiness}>{item.business.name}</Text>
              </View>
              <View style={styles.cardRow}>
                <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.cardClient}>{item.client.name} · {item.client.phone}</Text>
              </View>

              {/* Reason */}
              <Text style={styles.cardReason}>{item.reason}</Text>

              {/* Description */}
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}

              {/* Date + spinner */}
              <View style={styles.cardFooter}>
                {updatingId === item.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.cardHint}>לחץ לעדכון סטטוס</Text>
                }
                <Text style={styles.cardDate}>
                  {format(new Date(item.createdAt), 'd MMM yyyy', { locale: he })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary },

  filters: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border,
  },
  filterPillActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaint },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.primary, fontWeight: '700' },

  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, gap: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  badge: {
    alignSelf: 'flex-end', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  cardBusiness: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardClient: { fontSize: 13, color: colors.textSecondary },
  cardReason: { fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'right' },
  cardDesc: { fontSize: 13, color: colors.text, textAlign: 'right', lineHeight: 19 },
  cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  cardDate: { fontSize: 11, color: colors.placeholder },
  cardHint: { fontSize: 11, color: colors.placeholder },
})
