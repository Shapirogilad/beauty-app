import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { RootStackParamList } from '../../navigation/types'
import { fetchAdminClients, AdminClient } from '../../services/adminService'
import { colors } from '../../theme/colors'

type Nav = NativeStackNavigationProp<RootStackParamList>

function formatILS(agorot: number) {
  return `₪${(agorot / 100).toFixed(0)}`
}

export default function AdminClientsScreen() {
  const nav = useNavigation<Nav>()
  const [clients, setClients] = useState<AdminClient[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (q?: string) => {
    try {
      const data = await fetchAdminClients(q)
      setClients(data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function handleSearch(text: string) {
    setSearch(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(text || undefined), 400)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>לקוחות ({clients.length})</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.placeholder} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="חיפוש לפי שם, טלפון, מייל..."
          placeholderTextColor={colors.placeholder}
          textAlign="right"
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search || undefined) }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>לא נמצאו לקוחות</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => nav.navigate('AdminClientDetail', { clientId: item.id, clientName: item.name })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.phone}{item.city ? ` · ${item.city}` : ''}</Text>
                <Text style={styles.rowSub}>
                  {item.bookingCount} הזמנות · {formatILS(item.totalSpentAgorot)} סה"כ
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowDate}>{format(new Date(item.createdAt), 'dd/MM/yy')}</Text>
                <Ionicons name="chevron-back" size={16} color={colors.placeholder} />
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    margin: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 14, gap: 10, paddingBottom: 30 },
  emptyText: { textAlign: 'center', color: colors.placeholder, paddingTop: 40, fontSize: 15 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '700', color: colors.primary },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'left' },
  rowSub: { fontSize: 12, color: colors.textSecondary, textAlign: 'left' },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowDate: { fontSize: 11, color: colors.placeholder },
})
