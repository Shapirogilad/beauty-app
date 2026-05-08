import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { fetchBusinesses } from '../../services/businessService'
import { BusinessSummary } from '../../types/business'
import { SalonCard } from '../../components/ui/SalonCard'
import { RootStackParamList } from '../../navigation/types'
import { colors } from '../../theme/colors'

type Nav = NativeStackNavigationProp<RootStackParamList>
type Route = RouteProp<RootStackParamList, 'Search'>

interface Category {
  key: string
  label: string
  emoji: string
}

const CATEGORIES: Category[] = [
  { key: 'שיער',                label: 'שיער',       emoji: '✂️' },
  { key: 'ציפורניים',           label: 'ציפורניים',  emoji: '💅' },
  { key: 'מניקור / פדיקור',    label: 'מניקור',     emoji: '🌸' },
  { key: 'לייזר',               label: 'לייזר',      emoji: '⚡' },
  { key: 'שעווה / אפילציה',    label: 'שעווה',      emoji: '🪷' },
  { key: 'גבות',                label: 'גבות',       emoji: '🖊️' },
  { key: 'ריסים',               label: 'ריסים',      emoji: '👁️' },
  { key: 'טיפול פנים',          label: 'פנים',       emoji: '🌿' },
  { key: 'עיסוי',               label: 'עיסוי',      emoji: '🤍' },
  { key: 'איפור',               label: 'איפור',      emoji: '💄' },
]

export default function SearchScreen() {
  const nav   = useNavigation<Nav>()
  const route = useRoute<Route>()

  const [query, setQuery]         = useState('')
  const [category, setCategory]   = useState<string | null>(route.params?.category ?? null)
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [loading, setLoading]     = useState(false)
  const [total, setTotal]         = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (q: string, cat: string | null) => {
    setLoading(true)
    try {
      const res = await fetchBusinesses({
        search: q.trim() || undefined,
        category: cat ?? undefined,
        pageSize: 30,
      })
      setBusinesses(res.data)
      setTotal(res.total)
    } catch {
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + when category changes
  useEffect(() => {
    load(query, category)
  }, [category])

  // Debounce text search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(query, category), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  function handleCategoryPress(key: string) {
    setCategory((prev) => (prev === key ? null : key))
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="חפשי סלון או מעצבת..."
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            textAlign="right"
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.placeholder} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsContainer}
      >
        {CATEGORIES.map((cat) => {
          const active = category === cat.key
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => handleCategoryPress(cat.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Results count */}
      {!loading && (
        <Text style={styles.resultsCount}>
          {total === 0 ? 'לא נמצאו תוצאות' : `נמצאו ${total} עסקים`}
        </Text>
      )}

      {/* Results list */}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <SalonCard
              business={item}
              variant="vertical"
              onPress={(id) => nav.navigate('BusinessProfile', { businessId: id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>לא נמצאו תוצאות</Text>
              <Text style={styles.emptySub}>נסי לשנות את הסינון או החיפוש</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginLeft: 6 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  clearBtn: { padding: 4 },
  chipsContainer: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chips: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    paddingBottom: 10,
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryFaint,
    borderColor: colors.primary,
  },
  chipEmoji: { fontSize: 14 },
  chipLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  chipLabelActive: { color: colors.primary, fontWeight: '700' },
  resultsCount: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'left',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  loader: { flex: 1, marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary },
})
