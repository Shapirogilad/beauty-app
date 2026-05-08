import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '../../navigation/types'
import { fetchBusinessById } from '../../services/businessService'
import { useBookingStore } from '../../store/bookingStore'
import { ServiceItem } from '../../types/business'
import { formatPrice, formatDuration } from '../../utils/shabbat'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceSelect'>

export default function ServiceSelectScreen({ route, navigation }: Props) {
  const { businessId } = route.params
  const setDraftField = useBookingStore((s) => s.setDraftField)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBusinessById(businessId)
      .then((b) => setServices(b.services))
      .finally(() => setLoading(false))
  }, [businessId])

  function handleSelect(service: ServiceItem) {
    setDraftField('serviceId', service.id)
    navigation.navigate('StylistSelect', { businessId, serviceId: service.id })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>בחרי שירות</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {services.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.serviceCard}
              onPress={() => handleSelect(service)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.nameHe}</Text>
                <View style={styles.serviceMeta}>
                  <Text style={styles.metaText}>{formatDuration(service.durationMinutes)}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.price}>{formatPrice(service.price)}</Text>
                </View>
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
  serviceCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  serviceInfo: { flex: 1, gap: 4 },
  serviceName: { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'left' },
  serviceMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.textSecondary },
  dot: { fontSize: 13, color: colors.placeholder },
  price: { fontSize: 14, fontWeight: '700', color: colors.primary },
})
