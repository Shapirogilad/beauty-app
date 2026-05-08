import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Keyboard,
} from 'react-native'
import MapView, { Marker, Region, PROVIDER_DEFAULT } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { RootStackParamList } from '../../navigation/types'
import { useLocationStore } from '../../store/locationStore'
import { fetchBusinesses } from '../../services/businessService'
import { BusinessSummary, ServiceCategory, CATEGORY_TO_HEBREW } from '../../types/business'
import { ALL_CATEGORIES } from '../../components/ui/CategoryCard'
import { photonSearch, photonLabel, PhotonFeature } from '../../utils/photonSearch'
import { colors } from '../../theme/colors'

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessMap'>

const ZOOM_THRESHOLD = 0.15

const CATEGORY_EMOJI: Record<ServiceCategory, string> = {
  hair: '✂️', nails: '💅', manicure: '🪮', laser: '⚡',
  waxing: '🌿', eyebrows: '🤎', lashes: '👁️', facial: '🧖',
  massage: '💆', makeup: '💄',
}
const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  hair: 'שיער', nails: 'ציפורניים', manicure: 'מניקור', laser: 'לייזר',
  waxing: 'שעווה', eyebrows: 'גבות', lashes: 'ריסים', facial: 'טיפול פנים',
  massage: 'עיסוי', makeup: 'איפור',
}



export default function BusinessMapScreen({ navigation }: Props) {
  const mapRef = useRef<MapView>(null)
  const { lat: userLat, lng: userLng, requestGps } = useLocationStore()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Prevents re-fetching suggestions after the user picks one
  const skipNextSearch = useRef(false)

  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSummary | null>(null)
  const [zoomedOut, setZoomedOut] = useState(false)

  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchedPin, setSearchedPin] = useState<{ lat: number; lng: number } | null>(null)

  const initialRegion: Region = {
    latitude: userLat ?? 32.0853,
    longitude: userLng ?? 34.7818,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  }

  useEffect(() => {
    if (userLat === null) requestGps()
  }, [])

  useEffect(() => {
    loadBusinesses()
  }, [selectedCategory])

  useEffect(() => {
    if (userLat !== null && userLng !== null) {
      mapRef.current?.animateToRegion({
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }, 600)
    }
  }, [userLat, userLng])

  async function loadBusinesses() {
    setLoading(true)
    setFetchError(false)
    try {
      const result = await fetchBusinesses({
        category: selectedCategory ? CATEGORY_TO_HEBREW[selectedCategory] : undefined,
        sort: 'rating',
        pageSize: 200,
      })
      const valid = result.data.filter((b) => b.lat !== 0 && b.lng !== 0)
      setBusinesses(valid)
    } catch {
      setFetchError(true)
      setBusinesses([])
    } finally {
      setLoading(false)
    }
  }

  function handleRegionChange(region: Region) {
    setZoomedOut(region.latitudeDelta > ZOOM_THRESHOLD)
    if (region.latitudeDelta > ZOOM_THRESHOLD) setSelectedBusiness(null)
  }

  function handleMarkerPress(business: BusinessSummary) {
    setSelectedBusiness(business)
    mapRef.current?.animateToRegion({
      latitude: business.lat - 0.004,
      longitude: business.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 400)
  }

  function handleLocateMe() {
    if (userLat !== null && userLng !== null) {
      mapRef.current?.animateToRegion({
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      }, 500)
    }
  }

  // Debounced Photon autocomplete — skip if a suggestion was just picked
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }

    const trimmed = searchText.trim()
    if (trimmed.length < 2) { setSuggestions([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await photonSearch(trimmed)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setSearchLoading(false)
      }
    }, 350)
  }, [searchText])

  function handlePickSuggestion(item: PhotonFeature) {
    const [lon, lat] = item.geometry.coordinates
    const { main } = photonLabel(item)

    skipNextSearch.current = true
    setSuggestions([])
    setSearchText(main)
    setSearchedPin({ lat, lng: lon })
    Keyboard.dismiss()

    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lon, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      600,
    )
  }

  function clearSearch() {
    skipNextSearch.current = true
    setSearchText('')
    setSuggestions([])
    setSearchedPin(null)
  }

  const toggleCategory = useCallback((cat: ServiceCategory) => {
    setSelectedCategory((prev) => (prev === cat ? null : cat))
    setSelectedBusiness(null)
  }, [])

  const visibleBusinesses = !zoomedOut ? businesses : []

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={handleRegionChange}
        onPress={() => { setSelectedBusiness(null); setSuggestions([]); Keyboard.dismiss() }}
        onLongPress={() => {}}  // suppress native dropped-pin
      >
        {visibleBusinesses.map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            onPress={() => handleMarkerPress(b)}
            pinColor={selectedBusiness?.id === b.id ? colors.primary : '#2196F3'}
          />
        ))}

        {searchedPin && (
          <Marker
            coordinate={{ latitude: searchedPin.lat, longitude: searchedPin.lng }}
            pinColor="red"
          />
        )}
      </MapView>

      {/* Search bar + suggestions */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.placeholder} />
            <TextInput
              style={styles.searchInput}
              placeholder="חיפוש מיקום על המפה…"
              placeholderTextColor={colors.placeholder}
              value={searchText}
              onChangeText={setSearchText}
              textAlign="right"
            />
            {searchLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : searchText.length > 0
                ? <TouchableOpacity onPress={clearSearch}>
                    <Ionicons name="close-circle" size={16} color={colors.placeholder} />
                  </TouchableOpacity>
                : null
            }
          </View>
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item, i) => {
              const { main, sub } = photonLabel(item)
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.suggestionItem, i < suggestions.length - 1 && styles.suggestionBorder]}
                  onPress={() => handlePickSuggestion(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={15} color={colors.placeholder} />
                  <View style={styles.suggestionText}>
                    <Text style={styles.suggestionMain} numberOfLines={1}>{main}</Text>
                    {!!sub && <Text style={styles.suggestionSub} numberOfLines={1}>{sub}</Text>}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </SafeAreaView>

      {/* Category filter pills */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {ALL_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={styles.filterEmoji}>{CATEGORY_EMOJI[cat]}</Text>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {CATEGORY_LABEL[cat]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Locate me */}
      <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe}>
        <Ionicons name="navigate" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Status badges */}
      {loading && (
        <View style={styles.badge} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.badgeText}>טוענת עסקים…</Text>
        </View>
      )}
      {!loading && fetchError && (
        <View style={[styles.badge, styles.badgeError]} pointerEvents="none">
          <Ionicons name="warning-outline" size={14} color={colors.error} />
          <Text style={[styles.badgeText, { color: colors.error }]}>לא ניתן לטעון עסקים</Text>
        </View>
      )}
      {!loading && !fetchError && businesses.length === 0 && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>לא נמצאו עסקים באזור זה</Text>
        </View>
      )}
      {zoomedOut && !loading && businesses.length > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>התקרבי למפה כדי לראות את העסקים</Text>
        </View>
      )}

      {/* Business bottom card */}
      {selectedBusiness && (
        <View style={styles.businessCard}>
          <View style={styles.businessCardInner}>
            <View style={styles.businessInfo}>
              <View style={styles.businessNameRow}>
                {selectedBusiness.category[0] && (
                  <Text style={styles.businessEmoji}>{CATEGORY_EMOJI[selectedBusiness.category[0]]}</Text>
                )}
                <Text style={styles.businessName} numberOfLines={1}>{selectedBusiness.name}</Text>
              </View>
              <Text style={styles.businessAddress} numberOfLines={1}>{selectedBusiness.address}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {selectedBusiness.rating.toFixed(1)} ({selectedBusiness.reviewCount})
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('BusinessProfile', { businessId: selectedBusiness.id })}
            >
              <Text style={styles.profileBtnText}>לפרופיל</Text>
              <Ionicons name="chevron-back" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  suggestions: {
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionText: { flex: 1 },
  suggestionMain: { fontSize: 14, color: colors.text, fontWeight: '500', textAlign: 'right' },
  suggestionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1, textAlign: 'right' },

  filterBar: {
    position: 'absolute',
    bottom: 110,
    left: 0,
    right: 0,
  },
  filterList: { paddingHorizontal: 14, gap: 8, flexDirection: 'row' },
  filterPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  filterPillActive: { backgroundColor: colors.primary },
  filterEmoji: { fontSize: 14 },
  filterLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  filterLabelActive: { color: '#fff' },

  locateBtn: {
    position: 'absolute',
    bottom: 170,
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  badge: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  badgeError: { borderWidth: 1, borderColor: colors.error },
  badgeText: { fontSize: 13, color: colors.text },

  businessCard: {
    position: 'absolute',
    bottom: 24,
    left: 14,
    right: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  businessCardInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  businessInfo: { flex: 1, gap: 3 },
  businessNameRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  businessEmoji: { fontSize: 16 },
  businessName: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'right', flex: 1 },
  businessAddress: { fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
  ratingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  profileBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profileBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
