import React, { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  searchCities, searchStreets, cityLabel, streetLabel, PhotonFeature,
} from '../../utils/photonSearch'
import { colors } from '../../theme/colors'

export interface AddressResult {
  address: string
  city: string
  feature: PhotonFeature
}

type Step = 'city' | 'street' | 'number'

interface Props {
  label: string
  placeholder?: string
  value: string
  onSelect: (result: AddressResult) => void
  onTabPress?: () => void
  error?: string
}

export function AddressAutocompleteInput({ label, onSelect, onTabPress, error }: Props) {
  const [step,   setStep]   = useState<Step | null>(null)

  const [cityQuery,   setCityQuery]   = useState('')
  const [streetQuery, setStreetQuery] = useState('')
  const [houseNumber, setHouseNumber] = useState('')

  const [selectedCity,          setSelectedCity]          = useState('')
  const [selectedStreet,        setSelectedStreet]        = useState('')
  const [selectedStreetFeature, setSelectedStreetFeature] = useState<PhotonFeature | null>(null)

  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([])
  const [loading,     setLoading]     = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function debounceSearch(fn: () => Promise<PhotonFeature[]>, text: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (text.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try { setSuggestions(await fn()) }
      catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 350)
  }

  function activateStep(s: Step) {
    setStep(s)
    setSuggestions([])
    onTabPress?.()
  }

  // ── City ─────────────────────────────────────────────────────────────────────
  function handleCityChange(text: string) {
    setCityQuery(text)
    setSelectedCity('')
    setSelectedStreet('')
    setStreetQuery('')
    setHouseNumber('')
    setSuggestions([])
    debounceSearch(() => searchCities(text), text)
  }

  function handleCitySelect(f: PhotonFeature) {
    const city = cityLabel(f)
    setSelectedCity(city)
    setCityQuery(city)
    setSuggestions([])
    setStep('street')
  }

  // ── Street ────────────────────────────────────────────────────────────────────
  function handleStreetChange(text: string) {
    setStreetQuery(text)
    setSelectedStreet('')
    setHouseNumber('')
    setSuggestions([])
    debounceSearch(() => searchStreets(text, selectedCity), text)
  }

  function handleStreetSelect(f: PhotonFeature) {
    const street = streetLabel(f)
    setSelectedStreet(street)
    setStreetQuery(street)
    setSelectedStreetFeature(f)
    setSuggestions([])
    setStep('number')
  }

  // ── Number ────────────────────────────────────────────────────────────────────
  function handleNumberChange(text: string) {
    const digits = text.replace(/\D/g, '')
    setHouseNumber(digits)
    if (digits && selectedStreet && selectedCity && selectedStreetFeature) {
      onSelect({ address: `${selectedStreet} ${digits}`, city: selectedCity, feature: selectedStreetFeature })
    }
  }

  const allDone = !!(selectedCity && selectedStreet && houseNumber)

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.card, allDone && styles.cardDone]}>

        {/* ── Row 1: City ── */}
        <StepRow
          number={1}
          title="עיר"
          value={selectedCity}
          active={step === 'city'}
          locked={false}
          onPress={() => activateStep('city')}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={cityQuery}
              onChangeText={handleCityChange}
              placeholder="הקלידי שם עיר..."
              placeholderTextColor={colors.placeholder}
              textAlign="right"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {loading
              ? <ActivityIndicator size="small" color={colors.primary} style={styles.icon} />
              : cityQuery.length > 0
                ? <TouchableOpacity onPress={() => handleCityChange('')} style={styles.icon}>
                    <Ionicons name="close-circle" size={18} color={colors.placeholder} />
                  </TouchableOpacity>
                : <Ionicons name="search" size={17} color={colors.placeholder} style={styles.icon} />
            }
          </View>
          <Dropdown
            items={suggestions}
            renderLabel={(f) => cityLabel(f)}
            onSelect={handleCitySelect}
            icon="business-outline"
          />
        </StepRow>

        <View style={styles.separator} />

        {/* ── Row 2: Street ── */}
        <StepRow
          number={2}
          title="רחוב"
          value={selectedStreet}
          active={step === 'street'}
          locked={!selectedCity}
          onPress={() => activateStep('street')}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={streetQuery}
              onChangeText={handleStreetChange}
              placeholder={`שם רחוב ב${selectedCity}...`}
              placeholderTextColor={colors.placeholder}
              textAlign="right"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {loading
              ? <ActivityIndicator size="small" color={colors.primary} style={styles.icon} />
              : streetQuery.length > 0
                ? <TouchableOpacity onPress={() => handleStreetChange('')} style={styles.icon}>
                    <Ionicons name="close-circle" size={18} color={colors.placeholder} />
                  </TouchableOpacity>
                : <Ionicons name="search" size={17} color={colors.placeholder} style={styles.icon} />
            }
          </View>
          <Dropdown
            items={suggestions}
            renderLabel={(f) => streetLabel(f)}
            onSelect={handleStreetSelect}
            icon="map-outline"
          />
        </StepRow>

        <View style={styles.separator} />

        {/* ── Row 3: Number ── */}
        <StepRow
          number={3}
          title="מספר בית"
          value={houseNumber}
          active={step === 'number'}
          locked={!selectedStreet}
          onPress={() => activateStep('number')}
        >
          <TextInput
            style={styles.numberInput}
            value={houseNumber}
            onChangeText={handleNumberChange}
            placeholder="הקלידי מספר..."
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            textAlign="right"
            maxLength={4}
          />
        </StepRow>

      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepRow({
  number, title, value, active, locked, onPress, children,
}: {
  number: number
  title: string
  value: string
  active: boolean
  locked: boolean
  onPress: () => void
  children?: React.ReactNode
}) {
  return (
    <View>
      <TouchableOpacity
        style={styles.stepHeader}
        onPress={onPress}
        disabled={locked}
        activeOpacity={0.7}
      >
        <View style={[styles.stepBadge, active && styles.stepBadgeActive, !!value && !active && styles.stepBadgeDone]}>
          {!!value && !active
            ? <Ionicons name="checkmark" size={13} color="#fff" />
            : <Text style={styles.stepBadgeText}>{number}</Text>
          }
        </View>
        <View style={styles.stepTitleWrap}>
          <Text style={[styles.stepTitle, locked && styles.stepTitleLocked]}>{title}</Text>
          {!!value && !active && (
            <Text style={styles.stepValue} numberOfLines={1}>{value}</Text>
          )}
        </View>
        <Ionicons
          name={active ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={locked ? colors.border : colors.placeholder}
        />
      </TouchableOpacity>

      {active && (
        <View style={styles.stepBody}>
          {children}
        </View>
      )}
    </View>
  )
}

function Dropdown({
  items, renderLabel, onSelect, icon,
}: {
  items: PhotonFeature[]
  renderLabel: (f: PhotonFeature) => string
  onSelect: (f: PhotonFeature) => void
  icon: string
}) {
  if (items.length === 0) return null
  return (
    <View style={styles.dropdown}>
      {items.map((f, i) => {
        const name = renderLabel(f)
        if (!name) return null
        return (
          <TouchableOpacity
            key={i}
            style={[styles.suggestion, i < items.length - 1 && styles.divider]}
            onPress={() => onSelect(f)}
            activeOpacity={0.7}
          >
            <Ionicons name={icon as any} size={15} color={colors.textSecondary} />
            <Text style={styles.suggText} numberOfLines={1}>{name}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label:   { fontSize: 14, fontWeight: '600', color: colors.text },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardDone: { borderColor: colors.success },

  separator: { height: 1, backgroundColor: colors.border },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBadgeActive: { backgroundColor: colors.primary },
  stepBadgeDone:   { backgroundColor: colors.success },
  stepBadgeText:   { fontSize: 12, fontWeight: '700', color: '#fff' },

  stepTitleWrap: { flex: 1, alignItems: 'flex-start' },
  stepTitle:       { fontSize: 15, fontWeight: '600', color: colors.text },
  stepTitleLocked: { color: colors.placeholder },
  stepValue:       { fontSize: 13, color: colors.primary, fontWeight: '700', marginTop: 1 },

  stepBody: { paddingHorizontal: 16, paddingBottom: 14, gap: 8 },

  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    height: 46,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  icon:  { marginLeft: 6 },

  numberInput: {
    height: 46,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  error: { fontSize: 12, color: colors.error, textAlign: 'left' },

  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  divider:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  suggText: { flex: 1, fontSize: 15, color: colors.text, textAlign: 'right' },
})
