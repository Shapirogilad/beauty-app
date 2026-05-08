import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '../../navigation/types'
import { fetchStylistsForService } from '../../services/businessService'
import { useBookingStore } from '../../store/bookingStore'
import { StylistSummary } from '../../types/business'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'StylistSelect'>

const AVATAR_PLACEHOLDER = 'https://ui-avatars.com/api/?background=F5EDF1&color=7D4E6B&size=120&name='

export default function StylistSelectScreen({ route, navigation }: Props) {
  const { businessId, serviceId } = route.params
  const setDraftField = useBookingStore((s) => s.setDraftField)
  const [stylists, setStylists] = useState<StylistSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStylistsForService(businessId, serviceId)
      .then((list) => {
        setStylists(list)
        // Auto-skip if only one stylist
        if (list.length === 1) handleSelect(list[0])
      })
      .finally(() => setLoading(false))
  }, [businessId, serviceId])

  function handleSelect(stylist: StylistSummary) {
    setDraftField('stylistId', stylist.id)
    navigation.navigate('DateTimeSelect', { stylistId: stylist.id, serviceId })
  }

  function handleAny() {
    // Pick the first available stylist — the slot engine will find a free one
    if (stylists.length > 0) handleSelect(stylists[0])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>בחרי מעצבת</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {/* Any available option */}
          <TouchableOpacity style={styles.card} onPress={handleAny} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <View style={[styles.avatar, styles.anyAvatar]}>
              <Ionicons name="people" size={28} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>כל מעצבת זמינה</Text>
              <Text style={styles.sub}>נבחר בשבילך</Text>
            </View>
          </TouchableOpacity>

          {stylists.map((stylist) => (
            <TouchableOpacity
              key={stylist.id}
              style={styles.card}
              onPress={() => handleSelect(stylist)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Image
                source={{ uri: stylist.photo ?? `${AVATAR_PLACEHOLDER}${stylist.name}` }}
                style={styles.avatar}
              />
              <View style={styles.info}>
                <Text style={styles.name}>{stylist.name}</Text>
                {stylist.specialties?.length > 0 && (
                  <View style={styles.chips}>
                    {stylist.specialties.slice(0, 3).map((s) => (
                      <View key={s} style={styles.chip}>
                        <Text style={styles.chipText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  loader: { marginTop: 40 },
  list: { padding: 20, gap: 12 },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primaryFaint },
  anyAvatar: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'left' },
  sub: { fontSize: 13, color: colors.textSecondary, textAlign: 'left', marginTop: 2 },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chipText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
})
