import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { fetchOwnStylists, StylistProfile } from '../../services/businessOwnerService'
import { RootStackParamList } from '../../navigation/types'
import { colors } from '../../theme/colors'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function BusinessEmployeesScreen() {
  const nav = useNavigation<Nav>()
  const [stylists, setStylists] = useState<StylistProfile[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchOwnStylists()
      setStylists(data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>עובדות ({stylists.length})</Text>
        <TouchableOpacity
          onPress={() => nav.navigate('BusinessEmployeeEdit', {})}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={stylists}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.placeholder} />
              <Text style={styles.emptyText}>אין עובדות עדיין</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => nav.navigate('BusinessEmployeeEdit', {})}
              >
                <Text style={styles.emptyBtnText}>הוסיפי עובדת</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => nav.navigate('BusinessEmployeeEdit', { stylistId: item.id })}
              activeOpacity={0.8}
            >
              {item.photo
                ? <Image source={{ uri: item.photo }} style={styles.avatar} />
                : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>{item.name.charAt(0)}</Text>
                  </View>
                )
              }
              <View style={styles.cardInfo}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {!item.isActive && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>לא פעילה</Text>
                    </View>
                  )}
                </View>
                {item.bio ? (
                  <Text style={styles.cardBio} numberOfLines={2}>{item.bio}</Text>
                ) : null}
                {item.specialties.length > 0 && (
                  <View style={styles.chips}>
                    {item.specialties.slice(0, 4).map((s) => (
                      <View key={s} style={styles.chip}>
                        <Text style={styles.chipText}>{s}</Text>
                      </View>
                    ))}
                    {item.specialties.length > 4 && (
                      <Text style={styles.moreChips}>+{item.specialties.length - 4}</Text>
                    )}
                  </View>
                )}
                {item.instagram ? (
                  <View style={styles.instagramRow}>
                    <Ionicons name="logo-instagram" size={13} color="#C13584" />
                    <Text style={styles.instagramText}>{item.instagram}</Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.placeholder} />
            </TouchableOpacity>
          )}
        />
      )}
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
  addBtn: { padding: 4 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.placeholder },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 22, fontWeight: '700', color: colors.primary },
  cardInfo: { flex: 1, gap: 4 },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.text },
  inactiveBadge: {
    backgroundColor: colors.placeholder + '22',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveBadgeText: { fontSize: 10, color: colors.placeholder, fontWeight: '600' },
  cardBio: { fontSize: 12, color: colors.textSecondary, textAlign: 'left', lineHeight: 17 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4 },
  chip: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  moreChips: { fontSize: 11, color: colors.placeholder, alignSelf: 'center' },
  instagramRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  instagramText: { fontSize: 12, color: '#C13584' },
})
