import React, { useEffect, useCallback, useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { ChatBubbleIcon } from '../../components/ui/ChatBubbleIcon'
import { RootStackParamList } from '../../navigation/types'
import { useAuthStore } from '../../store/authStore'
import { useBusinessStore } from '../../store/businessStore'
import { useLocationStore } from '../../store/locationStore'
import { CategoryCard, ALL_CATEGORIES } from '../../components/ui/CategoryCard'
import { SalonCard } from '../../components/ui/SalonCard'
import { ServiceCategory } from '../../types/business'
import { photonSearch, photonLabel, PhotonFeature } from '../../utils/photonSearch'
import { colors } from '../../theme/colors'

type Nav = NativeStackNavigationProp<RootStackParamList>

export default function HomeScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<Nav>()
  const user = useAuthStore((s) => s.user)
  const {
    nearby, topRated,
    isLoadingNearby, isLoadingTopRated,
    selectedCategory,
    setCategory, loadNearby, loadTopRated,
  } = useBusinessStore()
  const { lat, lng, label, isCustom, loading: locationLoading, requestGps, setCustom, resetToGps } = useLocationStore()

  const [locationModalVisible, setLocationModalVisible] = useState(false)
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (lat === null) requestGps()
  }, [])

  const load = useCallback((currentLat: number, currentLng: number) => {
    loadNearby(currentLat, currentLng)
    loadTopRated()
  }, [loadNearby, loadTopRated])

  useEffect(() => {
    if (lat !== null && lng !== null) load(lat, lng)
  }, [lat, lng])

  // Debounced Photon autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = addressInput.trim()
    if (trimmed.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const results = await photonSearch(trimmed)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 350)
  }, [addressInput])

  function handlePickSuggestion(item: PhotonFeature) {
    const [lon, lat] = item.geometry.coordinates
    const { main } = photonLabel(item)
    setCustom(main, lat, lon)
    closeModal()
  }

  function closeModal() {
    setLocationModalVisible(false)
    setAddressInput('')
    setSuggestions([])
  }

  function handleCategoryPress(cat: ServiceCategory) {
    const next = selectedCategory === cat ? null : cat
    setCategory(next)
    if (lat !== null && lng !== null) {
      loadNearby(lat, lng)
      loadTopRated()
    }
  }

  function handleSalonPress(id: string) {
    navigation.navigate('BusinessProfile', { businessId: id })
  }

  const firstName = user?.name?.split(' ')[0] ?? ''
  const noCoords = lat === null || lng === null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcons}>
            <ChatBubbleIcon />
            <TouchableOpacity onPress={() => navigation.navigate('BusinessMap')}>
              <Ionicons name="map-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.greeting}>
            {firstName ? t('home.title', { name: firstName }) : 'דורה'}
          </Text>
          <TouchableOpacity>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('Search', {})}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={18} color={colors.placeholder} />
          <Text style={styles.searchPlaceholder}>{t('home.searchPlaceholder')}</Text>
        </TouchableOpacity>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
          <FlatList
            data={ALL_CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => (
              <CategoryCard
                category={item}
                selected={selectedCategory === item}
                onPress={handleCategoryPress}
                style={styles.categoryCard}
              />
            )}
          />
        </View>

        {/* Near you */}
        <View style={styles.section}>
          <View style={styles.nearYouHeader}>
            <Text style={styles.nearYouTitle}>{t('home.nearYou')}</Text>
            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => setLocationModalVisible(true)}
              activeOpacity={0.7}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name={isCustom ? 'location' : 'navigate'} size={14} color={colors.primary} />
              )}
              <Text style={styles.locationLabel} numberOfLines={1}>
                {locationLoading ? 'מאתר מיקום…' : label}
              </Text>
              <Ionicons name="chevron-back" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {locationLoading || noCoords ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : isLoadingNearby ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : nearby.length === 0 ? (
            <Text style={styles.emptyText}>{t('common.noResults')}</Text>
          ) : (
            <FlatList
              data={nearby}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => (
                <SalonCard
                  business={item}
                  onPress={handleSalonPress}
                  variant="horizontal"
                  style={styles.salonCardHorizontal}
                />
              )}
            />
          )}
        </View>

        {/* Top rated */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.topRated')}</Text>
          {isLoadingTopRated ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : topRated.length === 0 ? (
            <Text style={styles.emptyText}>{t('common.noResults')}</Text>
          ) : (
            <View style={styles.verticalList}>
              {topRated.map((business) => (
                <SalonCard
                  key={business.id}
                  business={business}
                  onPress={handleSalonPress}
                  variant="vertical"
                />
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Location picker modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>שינוי מיקום לחיפוש</Text>

            {/* Use GPS */}
            <TouchableOpacity
              style={styles.gpsBtn}
              onPress={() => { resetToGps(); closeModal() }}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={18} color={colors.primary} />
              <Text style={styles.gpsBtnText}>השתמשי במיקום הנוכחי</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>או חפשי כתובת</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Address autocomplete input */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.addressInput}
                placeholder="רחוב, עיר…"
                placeholderTextColor={colors.placeholder}
                value={addressInput}
                onChangeText={setAddressInput}
                textAlign="right"
                autoFocus
                returnKeyType="search"
              />
              {suggestionsLoading && (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.inputSpinner}
                />
              )}
            </View>

            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((item, index) => {
                  const { main, sub } = photonLabel(item)
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.suggestionItem,
                        index < suggestions.length - 1 && styles.suggestionBorder,
                      ]}
                      onPress={() => handlePickSuggestion(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={16} color={colors.placeholder} style={styles.suggestionIcon} />
                      <View style={styles.suggestionText}>
                        <Text style={styles.suggestionMain} numberOfLines={1}>{main}</Text>
                        {!!sub && <Text style={styles.suggestionSub} numberOfLines={1}>{sub}</Text>}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
              <Text style={styles.cancelBtnText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 32 },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerIcons: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16 },
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 48,
  },
  searchPlaceholder: { flex: 1, fontSize: 15, color: colors.placeholder, textAlign: 'left' },
  section: { marginBottom: 28 },
  nearYouHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 4,
  },
  nearYouTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  locationLabel: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    maxWidth: 220,
  },
  categoriesList: { paddingHorizontal: 20, gap: 10 },
  categoryCard: { marginEnd: 0 },
  horizontalList: { paddingHorizontal: 20, gap: 12 },
  salonCardHorizontal: { marginEnd: 0 },
  verticalList: { paddingHorizontal: 20, gap: 12 },
  loader: { marginTop: 20 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  gpsBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryFaint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingVertical: 14,
  },
  gpsBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  dividerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.textSecondary },
  inputWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  addressInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  inputSpinner: { marginStart: 8 },
  suggestionsList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionIcon: { flexShrink: 0 },
  suggestionText: { flex: 1 },
  suggestionMain: { fontSize: 14, color: colors.text, fontWeight: '500', textAlign: 'right' },
  suggestionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textAlign: 'right' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 15, color: colors.textSecondary },
})
